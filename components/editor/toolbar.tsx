"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useIsMac } from "@/components/layout/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Item = {
  key: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  run: () => void;
};

function useFormatState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => {
      // Only highlight active formats while the editor has focus; otherwise the toolbar
      // would advertise whatever block the caret last sat in.
      const f = e.isFocused;
      return {
      bold: f && e.isActive("bold"),
      italic: f && e.isActive("italic"),
      underline: f && e.isActive("underline"),
      strike: f && e.isActive("strike"),
      code: f && e.isActive("code"),
      highlight: f && e.isActive("highlight"),
      link: f && e.isActive("link"),
      h1: f && e.isActive("heading", { level: 1 }),
      h2: f && e.isActive("heading", { level: 2 }),
      h3: f && e.isActive("heading", { level: 3 }),
      bullet: f && e.isActive("bulletList"),
      ordered: f && e.isActive("orderedList"),
      todo: f && e.isActive("taskList"),
      quote: f && e.isActive("blockquote"),
      codeBlock: f && e.isActive("codeBlock"),
      empty: e.state.selection.empty,
      };
    },
  });
}

export function useFormatItems(editor: Editor, onLink: () => void) {
  const s = useFormatState(editor);
  const mod = useIsMac() ? "⌘" : "Ctrl+";
  const shift = useIsMac() ? "⇧" : "Shift+";
  const alt = useIsMac() ? "⌥" : "Alt+";
  const c = () => editor.chain().focus();

  const marks: Item[] = [
    { key: "bold", label: "Bold", shortcut: `${mod}B`, icon: Bold, isActive: s.bold, run: () => c().toggleBold().run() },
    { key: "italic", label: "Italic", shortcut: `${mod}I`, icon: Italic, isActive: s.italic, run: () => c().toggleItalic().run() },
    { key: "underline", label: "Underline", shortcut: `${mod}U`, icon: Underline, isActive: s.underline, run: () => c().toggleUnderline().run() },
    { key: "strike", label: "Strikethrough", shortcut: `${mod}${shift}S`, icon: Strikethrough, isActive: s.strike, run: () => c().toggleStrike().run() },
    { key: "code", label: "Inline code", shortcut: `${mod}E`, icon: Code, isActive: s.code, run: () => c().toggleCode().run() },
    { key: "highlight", label: "Highlight", shortcut: `${mod}${shift}H`, icon: Highlighter, isActive: s.highlight, run: () => c().toggleHighlight().run() },
    { key: "link", label: "Link", shortcut: `${mod}K`, icon: Link2, isActive: s.link, run: onLink },
  ];
  const blocks: Item[] = [
    { key: "h1", label: "Heading 1", shortcut: `${mod}${alt}1`, icon: Heading1, isActive: s.h1, run: () => c().toggleHeading({ level: 1 }).run() },
    { key: "h2", label: "Heading 2", shortcut: `${mod}${alt}2`, icon: Heading2, isActive: s.h2, run: () => c().toggleHeading({ level: 2 }).run() },
    { key: "h3", label: "Heading 3", shortcut: `${mod}${alt}3`, icon: Heading3, isActive: s.h3, run: () => c().toggleHeading({ level: 3 }).run() },
    { key: "bullet", label: "Bulleted list", shortcut: `${mod}${shift}8`, icon: List, isActive: s.bullet, run: () => c().toggleBulletList().run() },
    { key: "ordered", label: "Numbered list", shortcut: `${mod}${shift}7`, icon: ListOrdered, isActive: s.ordered, run: () => c().toggleOrderedList().run() },
    { key: "todo", label: "Checklist", shortcut: `${mod}${shift}9`, icon: ListChecks, isActive: s.todo, run: () => c().toggleTaskList().run() },
    { key: "quote", label: "Quote", shortcut: `${mod}${shift}B`, icon: Quote, isActive: s.quote, run: () => c().toggleBlockquote().run() },
    { key: "codeBlock", label: "Code block", shortcut: `${mod}${alt}C`, icon: Code2, isActive: s.codeBlock, run: () => c().toggleCodeBlock().run() },
  ];
  return { marks, blocks, state: s };
}

export function ToolbarButton({ item, size = "sm" }: { item: Item; size?: "sm" | "md" }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={item.label}
            aria-pressed={item.isActive}
            onMouseDown={(e) => e.preventDefault()}
            onClick={item.run}
            tabIndex={-1}
            data-toolbar-item
            className={cn(
              "flex shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "size-7" : "size-8",
              item.isActive && "bg-muted text-foreground",
            )}
          />
        }
      >
        <item.icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {item.label}
        {item.shortcut && <span className="font-mono text-[10px] opacity-70">{item.shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export function Toolbar({
  editor,
  onLink,
  onImage,
  className,
}: {
  editor: Editor;
  onLink: () => void;
  onImage: () => void;
  className?: string;
}) {
  const { marks, blocks } = useFormatItems(editor, onLink);
  const extra: Item[] = [
    { key: "hr", label: "Divider", icon: Minus, isActive: false, run: () => editor.chain().focus().setHorizontalRule().run() },
    { key: "image", label: "Image", icon: ImagePlus, isActive: false, run: onImage },
  ];
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      aria-orientation="horizontal"
      className={cn("flex flex-wrap items-center gap-0.5", className)}
      // Roving focus: one Tab stop, arrow keys move between buttons.
      tabIndex={0}
      onFocus={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.querySelector<HTMLElement>("[data-toolbar-item]")?.focus();
      }}
      onKeyDown={(e) => {
        const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-toolbar-item]")];
        const i = items.indexOf(document.activeElement as HTMLElement);
        let next = -1;
        if (e.key === "ArrowRight") next = (i + 1) % items.length;
        else if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = items.length - 1;
        if (next >= 0) {
          e.preventDefault();
          items[next]?.focus();
        }
      }}
    >
      {blocks.slice(0, 3).map((i) => <ToolbarButton key={i.key} item={i} />)}
      <span className="mx-1 h-4 w-px shrink-0 bg-border" />
      {marks.map((i) => <ToolbarButton key={i.key} item={i} />)}
      <span className="mx-1 h-4 w-px shrink-0 bg-border" />
      {blocks.slice(3).map((i) => <ToolbarButton key={i.key} item={i} />)}
      <span className="mx-1 h-4 w-px shrink-0 bg-border" />
      {extra.map((i) => <ToolbarButton key={i.key} item={i} />)}
    </div>
  );
}
