import session from "express-session";

/** @returns {boolean} */
export function useMemorySessionStore() {
  const mode = String(process.env.SESSION_STORE || "").trim().toLowerCase();
  if (mode === "memory") return true;
  if (mode === "sqlite") return false;
  // Render: no persistent disk; native module often fails or mismatches Node ABI.
  if (process.env.RENDER === "true") return true;
  return false;
}

/**
 * @returns {Promise<import("express-session").Store | undefined>}
 * undefined → express-session MemoryStore (not persisted across restarts).
 */
export async function createSessionStore() {
  if (useMemorySessionStore()) {
    console.log("Session store: in-memory (sessions reset on process restart)");
    return undefined;
  }

  try {
    const SqliteStoreFactory = (await import("better-sqlite3-session-store")).default;
    const { db } = await import("./db.js");
    const Store = SqliteStoreFactory(session);
    console.log("Session store: SQLite");
    return new Store({
      client: db,
      expired: { clear: true, intervalMs: 15 * 60 * 1000 },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`SQLite session store unavailable, using in-memory: ${msg}`);
    return undefined;
  }
}
