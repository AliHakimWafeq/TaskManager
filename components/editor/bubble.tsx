"use client";

import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { Check, ExternalLink, Unlink } from "lucide-react";
import { useState } from "react";
import { ToolbarButton, useFormatItems } from "./toolbar";

/** Floating formatting menu shown over a text selection (Linear/Notion style). */
export function SelectionBubble({
  editor,
  container,
  linkMode,
  setLinkMode,
}: {
  editor: Editor;
  container: HTMLElement | null;
  linkMode: boolean;
  setLinkMode: (v: boolean) => void;
}) {
  const { marks, blocks } = useFormatItems(editor, () => setLinkMode(true));

  return (
    <BubbleMenu
      editor={editor}
      appendTo={() => container ?? document.body}
      options={{ placement: "top", offset: 8, flip: true, shift: { padding: 8 } }}
      shouldShow={({ editor: e, state, from, to }) => {
        if (linkMode) return true;
        if (!e.isEditable || state.selection.empty || from === to) return false;
        if (e.isActive("image") || e.isActive("codeBlock")) return false;
        return true;
      }}
      className="z-50"
    >
      <div
        className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        onMouseDown={(e) => {
          if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
        }}
      >
        {linkMode ? (
          <LinkEditor editor={editor} onDone={() => setLinkMode(false)} />
        ) : (
          <>
            {marks.map((i) => <ToolbarButton key={i.key} item={i} />)}
            <span className="mx-0.5 h-4 w-px bg-border" />
            {blocks.slice(0, 6).map((i) => <ToolbarButton key={i.key} item={i} />)}
          </>
        )}
      </div>
    </BubbleMenu>
  );
}

function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (/^(https?:|mailto:|\/|#)/i.test(v)) return v;
  return `https://${v}`;
}

function LinkEditor({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [value, setValue] = useState(current);

  function apply() {
    const href = normalizeUrl(value);
    const c = editor.chain().focus().extendMarkRange("link");
    if (href) c.setLink({ href }).run();
    else c.unsetLink().run();
    onDone();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste or type a link…"
        aria-label="Link URL"
        className="h-7 w-64 rounded-md bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onDone();
            editor.commands.focus();
          }
        }}
      />
      <button type="button" aria-label="Apply link" onClick={apply} className="flex size-7 items-center justify-center rounded-md hover:bg-muted">
        <Check className="size-3.5" />
      </button>
      {current && (
        <>
          <a
            href={current}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open link"
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
          >
            <ExternalLink className="size-3.5" />
          </a>
          <button
            type="button"
            aria-label="Remove link"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              onDone();
            }}
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
          >
            <Unlink className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
