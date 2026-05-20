/** Lazy-load SQLite admin helpers so Render never requires better-sqlite3 at startup. */

/** @returns {Promise<typeof import("./db.js")>} */
export async function loadAdminDb() {
  return import("./db.js");
}
