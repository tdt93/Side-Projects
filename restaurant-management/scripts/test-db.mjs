#!/usr/bin/env node
/**
 * Test Supabase DB connection and auto-detect pooler host (aws-0 vs aws-1).
 * Usage: node scripts/test-db.mjs
 *        node scripts/test-db.mjs <project-ref> <password> [region]
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

function readEnv() {
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function tryPush(databaseUrl, directUrl) {
  const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: directUrl },
    encoding: "utf8",
    shell: true,
  });
  const out = (result.stdout || "") + (result.stderr || "");
  return { ok: result.status === 0, out };
}

function buildUrls(projectRef, password, region, prefix) {
  const encoded = encodeURIComponent(password);
  const host = `${prefix}-${region}.pooler.supabase.com`;
  return {
    DATABASE_URL: `postgresql://postgres.${projectRef}:${encoded}@${host}:6543/postgres?pgbouncer=true`,
    DIRECT_URL: `postgresql://postgres.${projectRef}:${encoded}@${host}:5432/postgres`,
  };
}

function parseDirectUrl(url) {
  const u = new URL(url);
  const user = u.username;
  const projectRef = user.startsWith("postgres.") ? user.slice("postgres.".length) : null;
  const hostMatch = u.hostname.match(/^aws-(\d+)-(.+)\.pooler\.supabase\.com$/);
  return { projectRef, password: u.password, prefix: hostMatch ? `aws-${hostMatch[1]}` : null, region: hostMatch?.[2] };
}

async function main() {
  const [, , refArg, passArg, regionArg] = process.argv;
  const env = readEnv();

  if (refArg && passArg) {
    const region = regionArg || "eu-central-1";
    for (const prefix of ["aws-1", "aws-0"]) {
      const urls = buildUrls(refArg, passArg, region, prefix);
      console.log(`Trying ${prefix}-${region}...`);
      const { ok, out } = tryPush(urls.DATABASE_URL, urls.DIRECT_URL);
      if (ok) {
        console.log(`✓ Connected via ${prefix}-${region}.pooler.supabase.com`);
        console.log("\nUse these in .env:");
        console.log(`DATABASE_URL="${urls.DATABASE_URL}"`);
        console.log(`DIRECT_URL="${urls.DIRECT_URL}"`);
        process.exit(0);
      }
      if (out.includes("tenant/user")) console.log("  → wrong pooler cluster");
      else if (out.includes("Can't reach")) console.log("  → network unreachable");
      else console.log("  → failed");
    }
    console.error("\nCould not connect. Copy URLs from Supabase Dashboard → Connect button.");
    process.exit(1);
  }

  if (env.DIRECT_URL && env.DATABASE_URL) {
    console.log("Testing .env connection strings...");
    const { ok, out } = tryPush(env.DATABASE_URL, env.DIRECT_URL);
    if (ok) {
      console.log("✓ Database connection OK");
      process.exit(0);
    }
    console.error("✗ Connection failed");
    if (out.includes("tenant/user")) {
      console.error("\nLikely cause: wrong pooler host (aws-0 vs aws-1) or wrong region.");
      console.error("Fix: Supabase Dashboard → Connect → copy Transaction + Session URIs exactly.");
      const parsed = parseDirectUrl(env.DIRECT_URL);
      if (parsed.projectRef && parsed.password && parsed.region) {
        console.error("\nAuto-detecting pooler host...");
        for (const prefix of ["aws-1", "aws-0"]) {
          if (prefix === parsed.prefix) continue;
          const urls = buildUrls(parsed.projectRef, parsed.password, parsed.region, prefix);
          const retry = tryPush(urls.DATABASE_URL, urls.DIRECT_URL);
          if (retry.ok) {
            console.log(`\n✓ Found working host: ${prefix}-${parsed.region}.pooler.supabase.com`);
            console.log("Run: npm run db:configure -- with these URLs, or update .env manually.");
            process.exit(0);
          }
        }
      }
    }
    process.exit(1);
  }

  console.error("Usage: npm run db:test");
  console.error("   or: node scripts/test-db.mjs <project-ref> <password> [region]");
  process.exit(1);
}

main();
