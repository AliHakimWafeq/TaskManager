import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// Runtime data paths; the hints keep Turbopack from tracing them as build inputs.
export const DATA_DIR = process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const UPLOADS_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "uploads");
export const DB_PATH = path.join(/*turbopackIgnore: true*/ DATA_DIR, "app.db");

function createDb() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

// Keep a single connection across Next.js dev hot reloads.
const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof createDb> };
export const db = globalForDb.__db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export type DB = typeof db;
export { schema };
