import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import session from "express-session";
import SqliteStoreFactory from "better-sqlite3-session-store";
import passport from "passport";
import { fileURLToPath } from "url";
import { db, getUserByEmail, listUsers, updateUserPartnerFilter } from "./db.js";
import { checkLoginLocked, clearLoginLockout, recordLoginFailure } from "./login-lockout.js";

function formatCellValueForPartner(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v && typeof v === "object" && "url" in v) return v.url;
        return typeof v === "object" ? JSON.stringify(v) : String(v);
      })
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function partnerValueFromRecord(record, fieldName) {
  if (!fieldName || !record?.fields) return "";
  const raw = record.fields[fieldName];
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw;
  return formatCellValueForPartner(raw);
}

function normalizePartnerCompare(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env: ./airtable-viewer/.env first, then optional repo-root ../.env for missing keys only.
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

function stripEnvQuotes(value) {
  const s = String(value ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Production: https://partner.a2dsolutions.pl (no trailing slash). If unset, OAuth callback uses http://localhost:PORT. */
const PUBLIC_APP_BASE = stripEnvQuotes(process.env.PUBLIC_APP_URL || "").replace(/\/+$/, "");

function publicOrigin() {
  if (PUBLIC_APP_BASE) return PUBLIC_APP_BASE;
  return `http://localhost:${PORT}`;
}

const PAT = process.env.AIRTABLE_PAT;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = stripEnvQuotes(process.env.AIRTABLE_TABLE_NAME);
const SESSION_SECRET = process.env.SESSION_SECRET;

const PARTNERS_TABLE = stripEnvQuotes(process.env.AIRTABLE_PARTNERS_TABLE || "");
const PARTNER_EMAIL_FIELD = stripEnvQuotes(process.env.AIRTABLE_PARTNER_EMAIL_FIELD || "Email");
const PARTNER_PHONE_FIELD = stripEnvQuotes(process.env.AIRTABLE_PARTNER_PHONE_FIELD || "Kontakt");
/** Value must match rows' partner field on Sprawy / Klienty (same as AIRTABLE_PARTNER_GROUP_FIELD labels). */
const PARTNER_LABEL_FIELD = stripEnvQuotes(process.env.AIRTABLE_PARTNER_LABEL_FIELD || "Partner");

// =============================================================================
// LIST VIEW & GROUPING — edit in .env only (no UI for these)
// -----------------------------------------------------------------------------
// AIRTABLE_PARTNER_GROUP_FIELD
//   On the cases (Sprawy) table: must match the partner label from the row in AIRTABLE_PARTNERS_TABLE (AIRTABLE_PARTNER_LABEL_FIELD).
//   Rows with empty value or "BRAK" are excluded.
//
// AIRTABLE_LIST_VIEW_FIELDS
//   Comma-separated Airtable field NAMES exactly as in the base.
//   Order must match these fixed UI keys (for translations):
//     1 fullname  2 dob  3 passportNr  4 case  5 documentSubmittedDate
//     6 fingerprintDate  7 decisionExpectedDate  8 collectionCardDate
//   Example:
//     AIRTABLE_LIST_VIEW_FIELDS=Fullname,Date of birth,Passport nr.,Fingerprint-date,...
// =============================================================================

const LIST_VIEW_KEYS = [
  "fullname",
  "dob",
  "passportNr",
  "case",
  "documentSubmittedDate",
  "fingerprintDate",
  "decisionExpectedDate",
  "collectionCardDate",
];

function parseListViewColumns() {
  const raw = stripEnvQuotes(process.env.AIRTABLE_LIST_VIEW_FIELDS || "");
  const names = raw
    .split(",")
    .map((s) => stripEnvQuotes(s))
    .filter(Boolean);
  const cols = [];
  for (let i = 0; i < names.length && i < LIST_VIEW_KEYS.length; i++) {
    cols.push({ key: LIST_VIEW_KEYS[i], airtableField: names[i] });
  }
  return cols;
}

// "Klienty" table — client list view (name, DOB, passport, card expiry). Field names from .env.
const CLIENT_LIST_KEYS = ["fullname", "dob", "passportNr", "cardExpiredDate"];

function parseClientListColumns() {
  const raw = stripEnvQuotes(process.env.AIRTABLE_CLIENT_LIST_FIELDS || "");
  const names = raw
    .split(",")
    .map((s) => stripEnvQuotes(s))
    .filter(Boolean);
  const cols = [];
  for (let i = 0; i < names.length && i < CLIENT_LIST_KEYS.length; i++) {
    cols.push({ key: CLIENT_LIST_KEYS[i], airtableField: names[i] });
  }
  return cols;
}

const PARTNER_GROUP_FIELD =
  process.env.AIRTABLE_PARTNER_GROUP_FIELD?.trim() || "PARTNER (from Klienty)";

/** Field on table Klienty that stores partner (often "PARTNER" — not the linked label on Sprawy). */
const CLIENTS_PARTNER_FIELD =
  process.env.AIRTABLE_CLIENTS_PARTNER_FIELD?.trim() || "PARTNER";

const CLIENTS_TABLE = stripEnvQuotes(process.env.AIRTABLE_CLIENTS_TABLE || "Klienty");

const CACHE_TTL_MS = Math.max(15_000, (Number(process.env.AIRTABLE_CACHE_TTL_SEC) || 120) * 1000);

/** If set, GET /api/admin/users with header X-Admin-Secret lists SQLite users (see /admin-users.html). */
const ADMIN_USER_LIST_SECRET = stripEnvQuotes(process.env.ADMIN_USER_LIST_SECRET || "");

function envRateInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Per-IP caps to reduce credential stuffing, OAuth abuse, and scraping. Authenticated /api traffic is skipped by apiLimiter. */
const loginLimiter = rateLimit({
  windowMs: envRateInt("RATE_LIMIT_LOGIN_WINDOW_MS", 15 * 60 * 1000),
  max: envRateInt("RATE_LIMIT_LOGIN_MAX", 15),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

const adminRouteLimiter = rateLimit({
  windowMs: envRateInt("RATE_LIMIT_ADMIN_WINDOW_MS", 15 * 60 * 1000),
  max: envRateInt("RATE_LIMIT_ADMIN_MAX", 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: envRateInt("RATE_LIMIT_API_PER_MIN", 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
  skip: (req) => {
    if (req.path === "/health") return true;
    if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) return true;
    return false;
  },
});

/** @type {Map<string, { records: unknown[], ts: number }>} */
const tableCache = new Map();

function requireEnv() {
  const missing = [];
  if (!PAT) missing.push("AIRTABLE_PAT");
  if (!BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!TABLE) missing.push("AIRTABLE_TABLE_NAME");
  if (!PARTNERS_TABLE) missing.push("AIRTABLE_PARTNERS_TABLE");
  return missing;
}

function normalizeEmailLogin(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function normalizePhoneLogin(s) {
  return String(s ?? "").replace(/\D/g, "");
}

function lockoutMessageMs(remainingMs) {
  const m = Math.ceil(remainingMs / 60000);
  if (m >= 60) {
    const h = Math.ceil(m / 60);
    return `Too many failed attempts. Try again in about ${h} hour(s).`;
  }
  return `Too many failed attempts. Try again in about ${Math.max(1, m)} minute(s).`;
}

function requireSessionSecret() {
  if (process.env.NODE_ENV === "production" && !SESSION_SECRET) {
    console.error("Set SESSION_SECRET in production.");
    process.exit(1);
  }
}

requireSessionSecret();

const SqliteSessionStore = SqliteStoreFactory(session);

passport.serializeUser((user, done) => {
  done(
    null,
    JSON.stringify({ email: user.email, partnerFilter: user.partnerFilter })
  );
});

passport.deserializeUser((serialized, done) => {
  try {
    const u = JSON.parse(String(serialized));
    if (u && typeof u.email === "string" && typeof u.partnerFilter === "string" && u.partnerFilter) {
      return done(null, { email: u.email, partnerFilter: u.partnerFilter });
    }
  } catch {
    /* ignore */
  }
  done(null, null);
});

/**
 * @param {string} emailNorm
 * @param {string} phoneNorm
 * @returns {Promise<string | null>} partner label for filtering cases, or null if no match
 */
async function findPartnerFilterFromAirtable(emailNorm, phoneNorm) {
  if (!emailNorm || !phoneNorm) return null;
  const records = await fetchAllRecordsFromTable(PARTNERS_TABLE);
  for (const rec of records) {
    const fields = rec?.fields || {};
    const em = normalizeEmailLogin(fields[PARTNER_EMAIL_FIELD]);
    const ph = normalizePhoneLogin(partnerValueFromRecord(rec, PARTNER_PHONE_FIELD));
    if (em === emailNorm && ph === phoneNorm) {
      const label = partnerValueFromRecord(rec, PARTNER_LABEL_FIELD).trim();
      if (label) return label;
    }
  }
  return null;
}

app.use(express.json());
app.use(
  session({
    store: new SqliteSessionStore({
      client: db,
      expired: { clear: true, intervalMs: 15 * 60 * 1000 },
    }),
    secret: SESSION_SECRET || "dev-insecure-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api", apiLimiter);

function requireAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function fetchAllRecordsFromTable(tableName) {
  const urlBase = `https://api.airtable.com/v0/${encodeURIComponent(BASE_ID)}/${encodeURIComponent(tableName)}`;
  const headers = {
    Authorization: `Bearer ${PAT}`,
    "Content-Type": "application/json",
  };

  const all = [];
  let offset = null;

  do {
    const u = new URL(urlBase);
    u.searchParams.set("pageSize", "100");
    if (offset) u.searchParams.set("offset", offset);

    const res = await fetch(u, { headers });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Airtable ${res.status}: ${text || res.statusText}`);
      err.status = res.status;
      throw err;
    }
    const body = await res.json();
    if (Array.isArray(body.records)) all.push(...body.records);
    offset = body.offset || null;
  } while (offset);

  return all;
}

async function getCachedTableRecords(tableName) {
  const cacheKey = `${BASE_ID}::${tableName}`;
  const now = Date.now();
  const hit = tableCache.get(cacheKey);
  if (hit && now - hit.ts < CACHE_TTL_MS) {
    return hit.records;
  }
  const records = await fetchAllRecordsFromTable(tableName);
  tableCache.set(cacheKey, { records, ts: now });
  return records;
}

app.get("/api/config", (_req, res) => {
  const airtableMissing = requireEnv();
  const clientCols = parseClientListColumns();
  res.json({
    airtableConfigured: airtableMissing.length === 0,
    partnerGroupField: PARTNER_GROUP_FIELD,
    listViewColumns: parseListViewColumns(),
    clientListColumns: clientCols,
    clientsTable: CLIENTS_TABLE,
    clientListConfigured: airtableMissing.length === 0 && clientCols.length === CLIENT_LIST_KEYS.length,
    cacheTtlSec: Math.round(CACHE_TTL_MS / 1000),
  });
});

app.get("/api/health", (_req, res) => {
  const missing = requireEnv();
  res.json({
    ok: missing.length === 0,
    missingEnv: missing,
  });
});

app.get("/api/me", (req, res) => {
  if (!req.user?.email) return res.status(401).json({ user: null });
  res.json({
    user: { email: req.user.email, partnerFilter: req.user.partnerFilter },
  });
});

app.get("/api/admin/users", adminRouteLimiter, (req, res) => {
  if (!ADMIN_USER_LIST_SECRET) {
    return res.status(503).json({
      error: "Admin user list is disabled. Set ADMIN_USER_LIST_SECRET in .env and restart the server.",
    });
  }
  const sent = String(req.get("x-admin-secret") || "").trim();
  if (sent !== ADMIN_USER_LIST_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    res.json({ users: listUsers() });
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to list users" });
  }
});

app.patch("/api/admin/users", adminRouteLimiter, (req, res) => {
  if (!ADMIN_USER_LIST_SECRET) {
    return res.status(503).json({
      error: "Admin user list is disabled. Set ADMIN_USER_LIST_SECRET in .env and restart the server.",
    });
  }
  const sent = String(req.get("x-admin-secret") || "").trim();
  if (sent !== ADMIN_USER_LIST_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }
  if (!Object.prototype.hasOwnProperty.call(req.body || {}, "partner_filter")) {
    return res.status(400).json({ error: "partner_filter is required (use empty string to clear)" });
  }
  const raw = req.body.partner_filter;
  const partner =
    raw === null || raw === undefined || String(raw).trim() === ""
      ? null
      : String(raw).trim();
  try {
    updateUserPartnerFilter(email, partner);
    const row = getUserByEmail(email);
    res.json({
      ok: true,
      user: { email: row.email, partner_filter: row.partner_filter },
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Update failed" });
  }
});

app.post("/api/login", loginLimiter, async (req, res, next) => {
  const missing = requireEnv();
  if (missing.length) {
    return res.status(503).json({ error: "Server missing configuration", missing });
  }

  const emailRaw = String(req.body?.email || "").trim();
  const phoneRaw = String(req.body?.phone || "").trim();
  const emailNorm = normalizeEmailLogin(emailRaw);
  const phoneNorm = normalizePhoneLogin(phoneRaw);

  if (!emailNorm || !phoneNorm) {
    return res.status(400).json({ error: "Email and phone number are required." });
  }

  const locked = checkLoginLocked(req, emailNorm);
  if (locked.locked) {
    const retryAfterSec = Math.max(1, Math.ceil((locked.lockUntil - Date.now()) / 1000));
    res.set("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      error: lockoutMessageMs(locked.lockUntil - Date.now()),
      retryAfterSec,
    });
  }

  try {
    const partnerFilter = await findPartnerFilterFromAirtable(emailNorm, phoneNorm);
    if (!partnerFilter) {
      const outcome = recordLoginFailure(req, emailNorm);
      if (outcome.locked) {
        const retryAfterSec = Math.max(1, Math.ceil((outcome.lockUntil - Date.now()) / 1000));
        res.set("Retry-After", String(retryAfterSec));
        return res.status(429).json({
          error: lockoutMessageMs(outcome.lockUntil - Date.now()),
          retryAfterSec,
        });
      }
      return res.status(401).json({ error: "Invalid email or phone number." });
    }

    clearLoginLockout(req, emailNorm);
    const user = { email: emailNorm, partnerFilter };
    req.logIn(user, (e) => {
      if (e) return next(e);
      res.json({ user: { email: user.email } });
    });
  } catch (e) {
    next(e);
  }
});

app.post("/api/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

app.get("/api/records", requireAuth, async (req, res) => {
  const missing = requireEnv();
  if (missing.length) {
    return res.status(503).json({
      error: "Missing environment variables",
      missing,
    });
  }

  try {
    const expected = req.user?.partnerFilter?.trim();

    if (!expected) {
      return res.json({
        records: [],
        listViewColumns: parseListViewColumns(),
        partnerGroupField: PARTNER_GROUP_FIELD,
        noPartnerFilter: true,
      });
    }

    const expectedN = normalizePartnerCompare(expected);
    const all = await getCachedTableRecords(TABLE);
    const records = all.filter((r) => {
      const v = partnerValueFromRecord(r, PARTNER_GROUP_FIELD).trim();
      if (!v) return false;
      if (v.toUpperCase() === "BRAK") return false;
      return normalizePartnerCompare(v) === expectedN;
    });

    res.json({
      records,
      listViewColumns: parseListViewColumns(),
      partnerGroupField: PARTNER_GROUP_FIELD,
    });
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    res.status(status).json({
      error: e.message || "Failed to load records",
    });
  }
});

app.get("/api/clients", requireAuth, async (req, res) => {
  const missing = requireEnv();
  if (missing.length) {
    return res.status(503).json({
      error: "Missing environment variables",
      missing,
    });
  }

  const listCols = parseClientListColumns();
  if (listCols.length !== CLIENT_LIST_KEYS.length) {
    return res.status(503).json({
      error: "Client list not configured",
      detail: "Set AIRTABLE_CLIENT_LIST_FIELDS to four Airtable field names: fullname, dob, passportNr, cardExpiredDate order.",
    });
  }

  try {
    const expected = req.user?.partnerFilter?.trim();

    if (!expected) {
      return res.json({
        records: [],
        clientListColumns: listCols,
        noPartnerFilter: true,
      });
    }

    const expectedN = normalizePartnerCompare(expected);
    const all = await getCachedTableRecords(CLIENTS_TABLE);
    const records = all.filter((r) => {
      const v = partnerValueFromRecord(r, CLIENTS_PARTNER_FIELD).trim();
      if (!v) return false;
      if (v.toUpperCase() === "BRAK") return false;
      return normalizePartnerCompare(v) === expectedN;
    });

    res.json({
      records,
      clientListColumns: listCols,
    });
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    res.status(status).json({
      error: e.message || "Failed to load clients",
    });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT} — public URL: ${publicOrigin()}`);
  if (requireEnv().length) {
    console.warn("Set AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME in .env");
  }
  if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
    console.warn("Set SESSION_SECRET in production");
  }
  if (!PARTNERS_TABLE) {
    console.warn("Set AIRTABLE_PARTNERS_TABLE (Partner table) for login.");
  }
});
