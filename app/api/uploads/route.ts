import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { db, UPLOADS_DIR } from "@/lib/db";
import { attachments } from "@/lib/db/schema";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const taskId = form.get("taskId");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Only PNG, JPEG, GIF, WebP and SVG images are allowed" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is larger than 10 MB" }, { status: 413 });
  }

  const filename = `${nanoid(16)}.${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));
  db.insert(attachments)
    .values({
      id: nanoid(),
      taskId: typeof taskId === "string" && taskId ? taskId : null,
      filename,
      mime: file.type,
      size: file.size,
    })
    .run();

  return NextResponse.json({ url: `/api/uploads/${filename}` }, { status: 201 });
}
