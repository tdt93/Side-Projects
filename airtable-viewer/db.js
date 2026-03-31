import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, "data", "app.db"));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    partner_filter TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const columns = db.prepare("PRAGMA table_info(users)").all();
if (!columns.some((c) => c.name === "partner_filter")) {
  db.exec("ALTER TABLE users ADD COLUMN partner_filter TEXT");
}

/** @returns {{ id: number, email: string, password_hash: string | null, partner_filter: string | null } | undefined} */
export function getUserByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return undefined;
  return db
    .prepare("SELECT id, email, password_hash, partner_filter FROM users WHERE lower(email) = ?")
    .get(e);
}

/**
 * @param {string | null} passwordHash bcrypt hash or null for Google-only accounts
 * @param {string | null | undefined} partnerFilter value must match Airtable field named by AIRTABLE_PARTNER_GROUP_FIELD
 */
export function insertUser(email, passwordHash, partnerFilter = null) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Email required");
  const p =
    partnerFilter === null || partnerFilter === undefined || String(partnerFilter).trim() === ""
      ? null
      : String(partnerFilter).trim();
  db.prepare("INSERT INTO users (email, password_hash, partner_filter) VALUES (?, ?, ?)").run(
    e,
    passwordHash,
    p
  );
}

/** @param {string | null | undefined} partnerFilter set to null to clear */
export function updateUserPartnerFilter(email, partnerFilter) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Email required");
  const p =
    partnerFilter === null || partnerFilter === undefined || String(partnerFilter).trim() === ""
      ? null
      : String(partnerFilter).trim();
  const info = db.prepare("UPDATE users SET partner_filter = ? WHERE lower(email) = ?").run(p, e);
  if (info.changes === 0) throw new Error(`No user found: ${email}`);
}

export function userCount() {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get();
  return row?.n ?? 0;
}

/** @returns {{ id: number, email: string, partner_filter: string | null, created_at: string, has_password: boolean }[]} */
export function listUsers() {
  const rows = db
    .prepare(
      `SELECT id, email, partner_filter, created_at,
        CASE WHEN password_hash IS NOT NULL AND length(trim(password_hash)) > 0 THEN 1 ELSE 0 END AS hp
      FROM users ORDER BY lower(email)`
    )
    .all();
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    partner_filter: r.partner_filter,
    created_at: r.created_at,
    has_password: Boolean(r.hp),
  }));
}
