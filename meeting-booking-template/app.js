const { createServer } = require("http");
const fs = require("fs");
const path = require("path");
const next = require("next");

const appDir = __dirname;
const buildIdPath = path.join(appDir, ".next", "BUILD_ID");

if (!fs.existsSync(buildIdPath)) {
  console.error(
    "[gabinety] Missing .next/BUILD_ID — run `npm run build` on your PC and upload the .next folder.",
  );
  process.exit(1);
}

const dev = process.env.NEXT_DEV === "true";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = "0.0.0.0";

process.env.NODE_ENV = dev ? "development" : "production";

const app = next({ dev, hostname, port, dir: appDir });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
      console.log(
        `[gabinety] Next.js ready (${dev ? "dev" : "production"}) port=${port}`,
      );
    });
  })
  .catch((err) => {
    console.error("[gabinety] Failed to start Next.js:", err);
    process.exit(1);
  });
