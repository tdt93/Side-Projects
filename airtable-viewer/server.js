import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const PAT = process.env.AIRTABLE_PAT;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = process.env.AIRTABLE_TABLE_NAME;

function requireEnv() {
  const missing = [];
  if (!PAT) missing.push("AIRTABLE_PAT");
  if (!BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!TABLE) missing.push("AIRTABLE_TABLE_NAME");
  return missing;
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

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  const missing = requireEnv();
  res.json({
    ok: missing.length === 0,
    missingEnv: missing,
  });
});

app.get("/api/records", async (_req, res) => {
  const missing = requireEnv();
  if (missing.length) {
    return res.status(503).json({
      error: "Missing environment variables",
      missing,
    });
  }

  try {
    const records = await fetchAllRecords();
    res.json({ records });
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    res.status(status).json({
      error: e.message || "Failed to load records",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Open http://localhost:${PORT}`);
  if (requireEnv().length) {
    console.warn("Set AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME in .env");
  }
});
