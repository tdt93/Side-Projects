import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { updateUserPartnerFilter } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const email = process.argv[2];
const partner = process.argv[3];

if (!email) {
  console.error("Set or clear partner_filter for a user (must match Airtable field AIRTABLE_PARTNER_GROUP_FIELD).");
  console.error("");
  console.error('  npm run user:partner -- "user@company.com" "Exact partner label"');
  console.error('  npm run user:partner -- "user@company.com" ""   # clear (user will see no rows until set again)');
  process.exit(1);
}

const p = partner === "" || partner === '""' ? null : partner;
updateUserPartnerFilter(email, p);
console.log(`Updated partner_filter for ${email}: ${p ?? "(null)"}`);
