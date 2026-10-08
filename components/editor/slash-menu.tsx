"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { filterCommands, type BlockCommand } from "./commands";
import type { SlashBridge, SlashState } from "./slash-command";

export function SlashMenu({
  editor,
  state,
  commands,
  container,
  bridge,
  onClose,
}: {
  editor: Editor;
  state: SlashState;
  commands: BlockCommand[];
  container: HTMLElement | null;
  bridge: SlashBridge;
  onClose: () => void;
}) {
  const items = filterCommands(commands, state.query);
  const [selected, setSelected] = useState(0);
  const [prevQuery, setPrevQuery] = useState(state.query);
  if (prevQuery !== state.query) {
    setPrevQuery(state.query);
    setSelected(0);
  }
  const listRef = useRef<HTMLDivElement>(null);

  function run(item: BlockCommand | undefined) {
    if (!item) return;
    item.run(editor, state.range);
    onClose();
  }

  // Keyboard navigation is routed here from the Suggestion plugin.
  useEffect(() =>
    bridge.setKeyHandler((event) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((s) => (s - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        run(items[selected]);
        return true;
      }
      return false;
    }),
  );

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!state.rect || !container || items.length === 0) return null;
  const box = container.getBoundingClientRect();
  const top = state.rect.bottom - box.top + 6;
  const left = Math.max(0, Math.min(state.rect.left - box.left, box.width - 256));

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Insert block"
      className="absolute z-50 max-h-72 w-64 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
      style={{ top, left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-2 pt-1 pb-1.5 text-[11px] font-medium text-muted-foreground">Basic blocks</div>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === selected}
          data-index={i}
          onMouseEnter={() => setSelected(i)}
          onClick={() => run(item)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left",
            i === selected && "bg-accent text-accent-foreground",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
            <item.icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] leading-tight">{item.title}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{item.description}</span>
          </span>
          {item.hint && <kbd className="font-mono text-[10px] text-muted-foreground">{item.hint}</kbd>}
        </button>
      ))}
    </div>
  );
}
