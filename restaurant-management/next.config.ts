import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function getAllowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "restaurant-test-live.tdtdev.net",
    "restaurant-test.tdtdev.net",
  ]);

  const tunnelHost = process.env.DEV_TUNNEL_HOST?.trim();
  if (tunnelHost) origins.add(tunnelHost);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const host = new URL(appUrl).hostname;
      if (host && host !== "localhost") origins.add(host);
    } catch {
      /* ignore invalid URL */
    }
  }

  return [...origins];
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src https://www.openstreetmap.org https://maps.google.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: getAllowedDevOrigins(),
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
