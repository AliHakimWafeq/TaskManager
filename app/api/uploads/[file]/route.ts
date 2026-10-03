import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { db, UPLOADS_DIR } from "@/lib/db";
import { attachments } from "@/lib/db/schema";

const SAFE_NAME = /^[A-Za-z0-9_-]{1,32}\.[a-z0-9]{2,5}$/;

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!SAFE_NAME.test(file)) return new NextResponse("Not found", { status: 404 });
  const row = db.select().from(attachments).where(eq(attachments.filename, file)).get();
  if (!row) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(UPLOADS_DIR, file));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": row.mime,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(row.mime === "image/svg+xml" ? { "Content-Security-Policy": "script-src 'none'" } : {}),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
