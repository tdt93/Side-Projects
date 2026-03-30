import dotenv from "dotenv";
import express from "express";
import path from "path";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { getUserByEmail } from "./db.js";

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

const PAT = process.env.AIRTABLE_PAT;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = stripEnvQuotes(process.env.AIRTABLE_TABLE_NAME);
const SESSION_SECRET = process.env.SESSION_SECRET;
const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK =
  process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/api/auth/google/callback`;

// =============================================================================
// LIST VIEW & GROUPING — edit in .env only (no UI for these)
// -----------------------------------------------------------------------------
// AIRTABLE_PARTNER_GROUP_FIELD
//   Airtable field name whose value must match the per-user partner_filter in SQLite (see add-user script).
//   Rows with empty value or "BRAK" are excluded. Each user only sees rows for their assigned partner.
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

const PARTNER_GROUP_FIELD =
  process.env.AIRTABLE_PARTNER_GROUP_FIELD?.trim() || "PARTNER (from Klienty)";

function requireEnv() {
  const missing = [];
  if (!PAT) missing.push("AIRTABLE_PAT");
  if (!BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!TABLE) missing.push("AIRTABLE_TABLE_NAME");
  return missing;
}

function requireSessionSecret() {
  if (process.env.NODE_ENV === "production" && !SESSION_SECRET) {
    console.error("Set SESSION_SECRET in production.");
    process.exit(1);
  }
}

requireSessionSecret();

passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser((email, done) => {
  const row = getUserByEmail(email);
  done(null, row ? { email: row.email } : null);
});

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    (email, password, done) => {
      const row = getUserByEmail(email);
      if (!row || !row.password_hash) {
        return done(null, false);
      }
      if (!bcrypt.compareSync(password, row.password_hash)) {
        return done(null, false);
      }
      return done(null, { email: row.email });
    }
  )
);

if (GOOGLE_ID && GOOGLE_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_ID,
        clientSecret: GOOGLE_SECRET,
        callbackURL: GOOGLE_CALLBACK,
        scope: ["profile", "email"],
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value?.toLowerCase?.()?.trim();
        if (!email) return done(null, false);
        const row = getUserByEmail(email);
        if (!row) return done(null, false);
        return done(null, { email: row.email });
      }
    )
  );
}

app.use(express.json());
app.use(
  session({
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

function requireAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function fetchAllRecords() {
  const urlBase = `https://api.airtable.com/v0/${encodeURIComponent(BASE_ID)}/${encodeURIComponent(TABLE)}`;
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

function googleEnabled() {
  return Boolean(GOOGLE_ID && GOOGLE_SECRET);
}

app.get("/api/config", (_req, res) => {
  const airtableMissing = requireEnv();
  res.json({
    googleAuth: googleEnabled(),
    airtableConfigured: airtableMissing.length === 0,
    partnerGroupField: PARTNER_GROUP_FIELD,
    listViewColumns: parseListViewColumns(),
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
  if (!req.user) return res.status(401).json({ user: null });
  res.json({ user: req.user });
});

app.post("/api/login", (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    req.logIn(user, (e) => {
      if (e) return next(e);
      res.json({ user: { email: user.email } });
    });
  })(req, res, next);
});

app.post("/api/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

if (googleEnabled()) {
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?auth=denied" }),
    (req, res) => res.redirect("/")
  );
}

app.get("/api/records", requireAuth, async (req, res) => {
  const missing = requireEnv();
  if (missing.length) {
    return res.status(503).json({
      error: "Missing environment variables",
      missing,
    });
  }

  try {
    const row = getUserByEmail(req.user?.email);
    const expected = row?.partner_filter?.trim();

    if (!expected) {
      return res.json({
        records: [],
        listViewColumns: parseListViewColumns(),
        partnerGroupField: PARTNER_GROUP_FIELD,
        noPartnerFilter: true,
      });
    }

    const expectedN = normalizePartnerCompare(expected);
    const all = await fetchAllRecords();
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

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Open http://localhost:${PORT}`);
  if (requireEnv().length) {
    console.warn("Set AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME in .env");
  }
  if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
    console.warn("Set SESSION_SECRET in production");
  }
  if (!googleEnabled()) {
    console.warn("Optional: set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for Google sign-in");
  }
});
