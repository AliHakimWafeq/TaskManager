import type { JSONContent } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import { baseExtensions } from "./extensions";

let manager: MarkdownManager | null = null;
function getManager() {
  manager ??= new MarkdownManager({ extensions: baseExtensions() });
  return manager;
}

/** Markdown -> Tiptap JSON document (string, as stored in tasks.description). */
export function markdownToDoc(markdown: string): string {
  const doc = getManager().parse(markdown);
  return JSON.stringify(doc);
}

/** Stored Tiptap JSON (string) -> Markdown. Plain-text legacy values pass through. */
export function docToMarkdown(stored: string | null | undefined): string {
  if (!stored) return "";
  let doc: JSONContent;
  try {
    doc = JSON.parse(stored) as JSONContent;
  } catch {
    return stored;
  }
  return getManager().serialize(doc).trim();
}
