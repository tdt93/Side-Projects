import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "gabinety.trzymsie.pl",
    "trzymsiedemo.tdtdev.net",
    "*.trycloudflare.com",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
