import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { insertUser, getUserByEmail } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const raw = process.argv.slice(2);
const google = raw.includes("--google");
const parts = raw.filter((a) => a !== "--google");

if (google) {
  const email = parts[0];
  const partner = parts[1] || null;
  if (!email) {
    console.error("Usage: npm run user:add -- \"email@example.com\" --google [\"Partner name\"]");
    process.exit(1);
  }
  if (getUserByEmail(email)) {
    console.error(`User already exists: ${email}`);
    process.exit(1);
  }
  insertUser(email, null, partner);
  console.log(`Added Google-only user: ${email}${partner ? ` (partner: ${partner})` : " (no partner — set partner_filter in DB)"}`);
} else {
  const email = parts[0];
  const password = parts[1];
  const partner = parts[2] || null;
  if (!email || !password) {
    console.error("Add an account that is allowed to sign in (admin-issued).");
    console.error("");
    console.error("  Email + password + optional partner (must match Airtable field named by AIRTABLE_PARTNER_GROUP_FIELD):");
    console.error('    npm run user:add -- "user@company.com" "your-secure-password" "Partner label"');
    console.error("");
    console.error("  Google sign-in only:");
    console.error('    npm run user:add -- "user@company.com" --google "Partner label"');
    process.exit(1);
  }
  if (getUserByEmail(email)) {
    console.error(`User already exists: ${email}`);
    process.exit(1);
  }
  const hash = bcrypt.hashSync(password, 12);
  insertUser(email, hash, partner);
  console.log(`Added user: ${email}${partner ? ` (partner: ${partner})` : " (no partner — set partner_filter in DB)"}`);
}
