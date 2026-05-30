const { spawnSync } = require("child_process");
const path = require("path");

// Must be set before Next/SWC/Tailwind (Rust/rayon) native code starts.
const env = {
  ...process.env,
  LOW_RESOURCE_BUILD: "1",
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  UV_THREADPOOL_SIZE: "1",
  RAYON_NUM_THREADS: "1",
  TOKIO_WORKER_THREADS: "1",
  NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=1536",
};

const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");

const result = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
  stdio: "inherit",
  env,
  cwd: path.join(__dirname, ".."),
});

process.exit(result.status ?? 1);
