/**
 * Alternative Passenger startup: runs `next start` (use if app.js gives 503).
 * In DirectAdmin set Application startup file to: scripts/start-passenger.js
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const appDir = path.join(__dirname, "..");
const buildId = path.join(appDir, ".next", "BUILD_ID");

if (!fs.existsSync(buildId)) {
  console.error("Missing .next/BUILD_ID — upload production build from PC.");
  process.exit(1);
}

const port = process.env.PORT || "3000";
const nextBin = path.join(appDir, "node_modules", "next", "dist", "bin", "next");

const child = spawn(
  process.execPath,
  [nextBin, "start", "-p", String(port), "-H", "0.0.0.0"],
  {
    cwd: appDir,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "inherit",
  },
);

child.on("exit", (code) => process.exit(code ?? 1));
