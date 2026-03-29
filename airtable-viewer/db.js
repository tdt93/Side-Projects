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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/** @returns {{ id: number, email: string, password_hash: string | null } | undefined} */
export function getUserByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return undefined;
  return db.prepare("SELECT id, email, password_hash FROM users WHERE lower(email) = ?").get(e);
}

/** @param {string | null} passwordHash bcrypt hash or null for Google-only accounts */
export function insertUser(email, passwordHash) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Email required");
  db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(e, passwordHash);
}

export function userCount() {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get();
  return row?.n ?? 0;
}
