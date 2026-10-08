import type { NextConfig } from "next";
import path from "node:path";

// Pin the workspace root: a package-lock.json in a parent folder otherwise confuses root detection.
const root = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
