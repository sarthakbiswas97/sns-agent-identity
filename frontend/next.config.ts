import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      fs: { browser: "./empty.js" },
      os: { browser: "./empty.js" },
      path: { browser: "./empty.js" },
      crypto: { browser: "./empty.js" },
    },
  },
};

export default nextConfig;
