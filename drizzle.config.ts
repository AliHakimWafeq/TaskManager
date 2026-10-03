import { defineConfig } from "drizzle-kit";
import path from "node:path";

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: path.join(dataDir, "app.db") },
  strict: true,
  verbose: true,
});
