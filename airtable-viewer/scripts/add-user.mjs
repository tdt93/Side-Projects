import "dotenv/config";
import bcrypt from "bcryptjs";
import { insertUser, getUserByEmail } from "../db.js";

const raw = process.argv.slice(2);
const google = raw.includes("--google");
const positional = raw.filter((a) => a !== "--google");

const email = positional[0];
const password = positional[1];

if (!email || (!google && !password)) {
  console.error("Add an account that is allowed to sign in (admin-issued).");
  console.error("");
  console.error("  Email + password:");
  console.error('    npm run user:add -- "user@company.com" "your-secure-password"');
  console.error("");
  console.error("  Google sign-in only (email must exist; no password stored):");
  console.error('    npm run user:add -- "user@company.com" --google');
  process.exit(1);
}

if (getUserByEmail(email)) {
  console.error(`User already exists: ${email}`);
  process.exit(1);
}

if (google) {
  insertUser(email, null);
  console.log(`Added Google-only user: ${email}`);
} else {
  const hash = bcrypt.hashSync(password, 12);
  insertUser(email, hash);
  console.log(`Added user with password: ${email}`);
}
