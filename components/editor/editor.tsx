"use client";

import { Extension, type Editor as TiptapEditor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { baseExtensions } from "@/lib/editor/extensions";
import { cn } from "@/lib/utils";
import { SelectionBubble } from "./bubble";
import { blockCommands } from "./commands";
import { createSlashCommand, SlashBridge, type SlashState } from "./slash-command";
import { SlashMenu } from "./slash-menu";
import { Toolbar } from "./toolbar";

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
      const id = toast.loading(`Uploading ${file.name || "image"}…`);
      const url = await uploadImage(file, taskId);
      toast.dismiss(id);
      if (!url) return;
      const chain = editor.chain().focus();
      if (pos !== undefined) chain.insertContentAt(pos, { type: "image", attrs: { src: url, alt: file.name } }).run();
      else chain.setImage({ src: url, alt: file.name }).run();
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

/** Heuristic: does plain pasted text look like Markdown worth converting? */
const MARKDOWN_HINT = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|- \[[ xX]\]|---\s*$)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`|~~[^~]+~~|==[^=]+==|\+\+[^+]+\+\+/;

export function Editor({
  content,
  onChange,
  taskId,
  placeholder = "Add a description… Type / for blocks, or paste Markdown",
  className,
  autoFocus,
  minHeight = "8rem",
  toolbar = "always",
  onSubmit,
}: {
  content: string | null | undefined;
  onChange: (json: string) => void;
  taskId?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  minHeight?: string;
  /** Show the formatting toolbar above the content. Slash and bubble menus are always available. */
  toolbar?: "always" | "never";
  /** Called on ⌘/Ctrl+Enter, e.g. to submit the surrounding form. */
  onSubmit?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(onChange);
  const editorRef = useRef<TiptapEditor | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [bridge] = useState(() => new SlashBridge());
  const [commands] = useState(() => blockCommands({ pickImage: () => bridge.pickImage() }));

  const [extensions] = useState(() => [
      ...baseExtensions(),
      Markdown,
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === "heading" ? "Heading" : placeholder),
        showOnlyCurrent: true,
      }),
      createSlashCommand(bridge),
      Extension.create({
        name: "linkShortcut",
        addKeyboardShortcuts: () => ({
          "Mod-Enter": () => bridge.submit(),
          "Mod-k": ({ editor }: { editor: TiptapEditor }) => {
            if (editor.state.selection.empty && !editor.isActive("link")) return false;
            setLinkMode(true);
            return true;
          },
        }),
      }),
    ]);

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    extensions,
    content: parseDoc(content),
    editorProps: {
      attributes: {
        class: cn("tiptap focus:outline-none", className),
        style: `min-height: ${minHeight}`,
        "aria-label": "Description",
      },
      handlePaste: (_view, event) => {
        const ed = editorRef.current;
        if (!ed) return false;
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          insertImages(ed, files, taskId);
          return true;
        }
        const html = event.clipboardData?.getData("text/html");
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (!html && text && !ed.isActive("codeBlock") && MARKDOWN_HINT.test(text)) {
          event.preventDefault();
          ed.commands.insertContent(text, { contentType: "markdown" });
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const ed = editorRef.current;
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (ed && files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          insertImages(ed, files, taskId, coords?.pos);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        latest.current(JSON.stringify(editor.getJSON()));
      }, 600);
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

  useEffect(() => bridge.subscribe(setSlash), [bridge]);
  useEffect(() => bridge.setImagePicker(() => fileInput.current?.click()), [bridge]);
  // ⌘/Ctrl+Enter: flush the debounced change first so the submit sees the latest content.
  useEffect(
    () =>
      bridge.setSubmitHandler(
        onSubmit
          ? () => {
              if (timer.current && editorRef.current) {
                clearTimeout(timer.current);
                timer.current = null;
                latest.current(JSON.stringify(editorRef.current.getJSON()));
              }
              onSubmit();
            }
          : null,
      ),
    [bridge, onSubmit],
  );

  // Flush a pending save when the editor unmounts (e.g. sheet closes mid-typing).
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
    <div
      ref={setContainer}
      className="group/editor relative -mx-2 rounded-lg px-2 pb-1 transition-shadow focus-within:ring-1 focus-within:ring-ring/60"
    >
      {editor && toolbar !== "never" && (
        <Toolbar
          editor={editor}
          onLink={() => {
            if (editor.state.selection.empty && !editor.isActive("link")) {
              toast.message("Select some text first, then add a link.");
              return;
            }
            setLinkMode(true);
          }}
          onImage={() => bridge.pickImage()}
          className="sticky top-0 z-10 -mx-1 mb-2 border-b bg-background/95 px-0.5 py-1 backdrop-blur"
        />
      )}
      <EditorContent editor={editor} />
      {editor && (
        <SelectionBubble editor={editor} container={container} linkMode={linkMode} setLinkMode={setLinkMode} />
      )}
      {editor && slash && (
        <SlashMenu
          editor={editor}
          state={slash}
          commands={commands}
          container={container}
          bridge={bridge}
          onClose={() => setSlash(null)}
        />
      )}
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
    </div>
  );
}
