"use client";

import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImagePlus } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export async function uploadImage(file: File, taskId?: string): Promise<string | null> {
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    toast.error("Only PNG, JPEG, GIF, WebP and SVG images are supported");
    return null;
  }
  const fd = new FormData();
  fd.append("file", file);
  if (taskId) fd.append("taskId", taskId);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    toast.error(body.error ?? "Upload failed");
    return null;
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

function insertImages(editor: TiptapEditor, files: File[], taskId?: string, pos?: number) {
  files
    .filter((f) => f.type.startsWith("image/"))
    .forEach(async (file) => {
      const url = await uploadImage(file, taskId);
      if (!url) return;
      const chain = editor.chain().focus();
      if (pos !== undefined) chain.insertContentAt(pos, { type: "image", attrs: { src: url } }).run();
      else chain.setImage({ src: url }).run();
    });
}

export function parseDoc(json: string | null | undefined) {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: json }] }] };
  }
}

export function Editor({
  content,
  onChange,
  taskId,
  placeholder = "Add a description… (paste or drop images)",
  className,
  autoFocus,
  minHeight = "8rem",
}: {
  content: string | null | undefined;
  onChange: (json: string) => void;
  taskId?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  minHeight?: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(onChange);
  const editorRef = useRef<TiptapEditor | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({ inline: false, allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: parseDoc(content),
    editorProps: {
      attributes: {
        class: cn("tiptap focus:outline-none", className),
        style: `min-height: ${minHeight}`,
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          insertImages(editorRef.current!, files, taskId);
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          insertImages(editorRef.current!, files, taskId, coords?.pos);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current(JSON.stringify(editor.getJSON())), 600);
    },
    onBlur: ({ editor }) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        latest.current(JSON.stringify(editor.getJSON()));
      }
    },
  });
  useEffect(() => {
    latest.current = onChange;
    editorRef.current = editor;
  });

  useEffect(
    () => () => {
      if (timer.current && editorRef.current) {
        clearTimeout(timer.current);
        latest.current(JSON.stringify(editorRef.current.getJSON()));
      }
    },
    [],
  );

  return (
    <div className="group/editor relative">
      <EditorContent editor={editor} />
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (editor && files.length) insertImages(editor, files, taskId);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="mt-1 text-muted-foreground opacity-0 transition-opacity group-focus-within/editor:opacity-100 group-hover/editor:opacity-100"
        onClick={() => fileInput.current?.click()}
      >
        <ImagePlus /> Add image
      </Button>
    </div>
  );
}
