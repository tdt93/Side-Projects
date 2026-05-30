const { execSync } = require("child_process");
const { join, resolve } = require("path");

// CyberFolks / DirectAdmin Node runs lifecycle scripts from nodevenv/.../lib,
// not from public_html/gabinety. INIT_CWD is where `npm install` was invoked.
const appRoot = process.env.INIT_CWD || resolve(__dirname, "..");
const schema = join(appRoot, "prisma", "schema.prisma");

execSync(`prisma generate --schema="${schema}"`, {
  stdio: "inherit",
  cwd: appRoot,
  env: process.env,
});
