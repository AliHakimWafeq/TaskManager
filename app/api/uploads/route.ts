import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { db } from "@/lib/db";
import { attachments, tasks } from "@/lib/db/schema";
import { isSameOrigin } from "@/lib/http";
import { writeUpload } from "@/lib/uploads";


export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin uploads are not allowed" }, { status: 403 });
  }
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Image is larger than 10 MB" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const file = form.get("file");
  const rawTaskId = form.get("taskId");
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

  let taskId: string | null = null;
  if (typeof rawTaskId === "string" && rawTaskId) {
    const task = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, rawTaskId)).get();
    if (!task) return NextResponse.json({ error: "Unknown task" }, { status: 400 });
    taskId = task.id;
  }

  const filename = `${nanoid(16)}.${ext}`;
  db.insert(attachments).values({ id: nanoid(), taskId, filename, mime: file.type, size: file.size }).run();
  try {
    await writeUpload(filename, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    db.delete(attachments).where(eq(attachments.filename, filename)).run();
    console.error("Upload failed", e);
    return NextResponse.json({ error: "Could not save the image" }, { status: 500 });
  }

  return NextResponse.json({ url: `/api/uploads/${filename}` }, { status: 201 });
}
