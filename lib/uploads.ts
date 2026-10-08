import fs from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/db";

const SAFE_NAME = /^[A-Za-z0-9_-]{1,32}\.[a-z0-9]{2,5}$/;

export function isSafeUploadName(name: string) {
  return SAFE_NAME.test(name);
}

/** Best-effort removal of uploaded files from disk. */
export async function removeUploadFiles(filenames: string[]) {
  await Promise.all(
    filenames
      .filter(isSafeUploadName)
      .map((f) => fs.rm(uploadPath(f), { force: true }).catch(() => {})),
  );
}

/**
 * Absolute path of an uploaded file. The ignore hint stops Turbopack from treating this
 * runtime data path as a build input (which would trace the whole project into the output).
 */
export function uploadPath(filename: string) {
  return path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, filename);
}

export async function writeUpload(filename: string, data: Buffer) {
  await fs.mkdir(/*turbopackIgnore: true*/ UPLOADS_DIR, { recursive: true });
  await fs.writeFile(uploadPath(filename), data);
}

export async function readUpload(filename: string) {
  return fs.readFile(uploadPath(filename));
}
