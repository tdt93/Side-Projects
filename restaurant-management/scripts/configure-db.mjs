#!/usr/bin/env node
/**
 * Write Supabase PostgreSQL URLs into .env for Prisma.
 *
 * Option A — paste URLs from Supabase Dashboard → Connect:
 *   npm run db:configure -- --database-url "postgresql://..." --direct-url "postgresql://..."
 *
 * Option B — project ref + database password:
 *   npm run db:configure -- <project-ref> <database-password> [aws-region]
 *
 * Optional storage (Settings → API):
 *   --supabase-url https://xxx.supabase.co --service-role-key eyJ...
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--database-url") out.databaseUrl = argv[++i];
    else if (a === "--direct-url") out.directUrl = argv[++i];
    else if (a === "--supabase-url") out.supabaseUrl = argv[++i];
    else if (a === "--service-role-key") out.serviceRoleKey = argv[++i];
    else if (a === "--region") out.region = argv[++i];
    else if (!out.projectRef) {
      out.projectRef = a;
      out.password = argv[++i];
      if (argv[i + 1] && !argv[i + 1].startsWith("--")) out.region = argv[++i];
    }
  }
  return out;
}

function readExistingEnv() {
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function buildFromRef(projectRef, password, region = "eu-central-1") {
  const encoded = encodeURIComponent(password);
  const host = `aws-0-${region}.pooler.supabase.com`;
  return {
    DATABASE_URL: `postgresql://postgres.${projectRef}:${encoded}@${host}:6543/postgres?pgbouncer=true`,
    DIRECT_URL: `postgresql://postgres.${projectRef}:${encoded}@${host}:5432/postgres`,
    NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
  };
}

function validatePostgresUrl(url, label) {
  if (url.match(/postgresql:\/\//g)?.length > 1) {
    throw new Error(`${label} contains multiple postgresql:// URLs pasted together. Paste only ONE URI per variable.`);
  }
  if (!url || url.includes("...") || url.includes("[password]") || url.includes("[project-ref]")) {
    throw new Error(`${label} looks like a placeholder. Paste the full URI from Supabase Dashboard → Connect.`);
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} is not a valid URL.`);
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(`${label} must start with postgresql://`);
  }
  if (!parsed.hostname.includes("supabase.com") && !parsed.hostname.includes("supabase.co")) {
    console.warn(`Warning: ${label} host is "${parsed.hostname}" — expected a Supabase pooler host.`);
  }
  return url;
}

function writeEnv(updates) {
  validatePostgresUrl(updates.DATABASE_URL, "DATABASE_URL");
  validatePostgresUrl(updates.DIRECT_URL, "DIRECT_URL");
  const prev = readExistingEnv();
  const env = { ...prev, ...updates };

  const lines = [
    "# Supabase PostgreSQL — updated by npm run db:configure",
    `DATABASE_URL="${env.DATABASE_URL}"`,
    `DIRECT_URL="${env.DIRECT_URL}"`,
    "",
    `SESSION_SECRET="${env.SESSION_SECRET || "dev-restaurant-session-secret-key-32"}"`,
    "",
    "# Optional: Supabase Storage (public bucket: menu-images)",
    `NEXT_PUBLIC_SUPABASE_URL="${env.NEXT_PUBLIC_SUPABASE_URL || ""}"`,
    `SUPABASE_SERVICE_ROLE_KEY="${env.SUPABASE_SERVICE_ROLE_KEY || ""}"`,
    "",
    `NEXT_PUBLIC_APP_URL="${env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}"`,
    "",
  ];

  fs.writeFileSync(envPath, lines.join("\n"));
  console.log(`Updated ${envPath}`);
}

const args = parseArgs(process.argv.slice(2));

if (args.databaseUrl && args.directUrl) {
  writeEnv({
    DATABASE_URL: args.databaseUrl,
    DIRECT_URL: args.directUrl,
    ...(args.supabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: args.supabaseUrl } : {}),
    ...(args.serviceRoleKey ? { SUPABASE_SERVICE_ROLE_KEY: args.serviceRoleKey } : {}),
  });
} else if (args.projectRef && args.password) {
  writeEnv(buildFromRef(args.projectRef, args.password, args.region));
} else {
  console.error(`
Configure Supabase for restaurant-management

1. Open https://supabase.com/dashboard → your project
2. Settings → Database → copy "Connection string" (URI)
   - Transaction pooler (6543) → DATABASE_URL
   - Session pooler (5432) → DIRECT_URL
3. Run ONE of:

   npm run db:configure -- --database-url "postgresql://..." --direct-url "postgresql://..."

   npm run db:configure -- YOUR_PROJECT_REF YOUR_DB_PASSWORD eu-central-1

4. Then: npm run db:setup
`);
  process.exit(1);
}

console.log("Next: npm run db:setup");
