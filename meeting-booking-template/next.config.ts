import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isHostingBuild = process.env.LOW_RESOURCE_BUILD === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "gabinety.trzymsie.pl",
    "trzymsiedemo.tdtdev.net",
    "*.trycloudflare.com",
    "localhost",
    "127.0.0.1",
  ],
  // Keep file tracing inside this app (repo root is parent "Side Projects").
  outputFileTracingRoot: projectRoot,
  ...(isHostingBuild
    ? {
        // CyberFolks: low process/thread limits — webpack + single CPU only.
        experimental: {
          workerThreads: false,
          cpus: 1,
        },
        webpack: (config, { dev }) => {
          if (!dev) {
            config.parallelism = 1;
            config.resolve = config.resolve ?? {};
            config.resolve.symlinks = false;
            if (config.cache && typeof config.cache === "object") {
              config.cache = { type: "memory" };
            }
          }
          return config;
        },
      }
    : {
        // PC / CI: Turbopack avoids webpack glob issues on Windows (EPERM junctions).
        turbopack: {},
      }),
};

export default nextConfig;
