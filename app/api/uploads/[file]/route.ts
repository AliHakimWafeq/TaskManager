import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attachments } from "@/lib/db/schema";
import { isSafeUploadName, readUpload } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!isSafeUploadName(file)) return new NextResponse("Not found", { status: 404 });
  const row = db.select().from(attachments).where(eq(attachments.filename, file)).get();
  if (!row) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readUpload(file);
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
