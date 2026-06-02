import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isHostingBuild = process.env.LOW_RESOURCE_BUILD === "1";

function getAllowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "gabinety.trzymsie.pl",
    "trzymsiedemo.tdtdev.net",
    "localhost",
    "127.0.0.1",
  ]);

  const tunnelHost = process.env.DEV_TUNNEL_HOST?.trim();
  if (tunnelHost) origins.add(tunnelHost);

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      const host = new URL(appUrl).hostname;
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        origins.add(host);
      }
    } catch {
      /* ignore invalid APP_URL */
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
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
