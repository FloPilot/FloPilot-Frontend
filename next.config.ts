import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Keep docs / marketing screenshots clean — no bottom-left Next.js badge.
  devIndicators: false,
};

export default nextConfig;
