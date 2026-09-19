import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@modelcontextprotocol/sdk",
    "@neondatabase/serverless",
    "@vercel/blob",
  ],
  // LOCAL.md and Casey loopback prompts use 127.0.0.1, which is a different
  // origin from localhost. Without this, Next 16 blocks /_next chunks.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
