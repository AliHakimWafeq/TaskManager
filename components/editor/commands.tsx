"use client";

import type { Editor, Range } from "@tiptap/core";
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
} from "lucide-react";

export type BlockCommand = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  /** Markdown shortcut you can type instead, shown as a hint. */
  hint?: string;
  run: (editor: Editor, range?: Range) => void;
};

/** Start a chain that first deletes the "/query" text when invoked from the slash menu. */
const chain = (editor: Editor, range?: Range) => {
  const c = editor.chain().focus();
  return range ? c.deleteRange(range) : c;
};

export function blockCommands(opts: { pickImage: () => void }): BlockCommand[] {
  return [
    {
      id: "text",
      title: "Text",
      description: "Plain paragraph",
      keywords: ["paragraph", "p", "normal"],
      icon: Pilcrow,
      run: (e, r) => chain(e, r).setParagraph().run(),
    },
    {
      id: "h1",
      title: "Heading 1",
      description: "Large section heading",
      keywords: ["h1", "title", "header"],
      icon: Heading1,
      hint: "#",
      run: (e, r) => chain(e, r).setHeading({ level: 1 }).run(),
    },
    {
      id: "h2",
      title: "Heading 2",
      description: "Medium section heading",
      keywords: ["h2", "subtitle", "header"],
      icon: Heading2,
      hint: "##",
      run: (e, r) => chain(e, r).setHeading({ level: 2 }).run(),
    },
    {
      id: "h3",
      title: "Heading 3",
      description: "Small section heading",
      keywords: ["h3", "header"],
      icon: Heading3,
      hint: "###",
      run: (e, r) => chain(e, r).setHeading({ level: 3 }).run(),
    },
    {
      id: "bullet",
      title: "Bulleted list",
      description: "Simple bulleted list",
      keywords: ["ul", "unordered", "bullets", "list"],
      icon: List,
      hint: "-",
      run: (e, r) => chain(e, r).toggleBulletList().run(),
    },
    {
      id: "ordered",
      title: "Numbered list",
      description: "List with numbers",
      keywords: ["ol", "ordered", "numbers", "list"],
      icon: ListOrdered,
      hint: "1.",
      run: (e, r) => chain(e, r).toggleOrderedList().run(),
    },
    {
      id: "todo",
      title: "Checklist",
      description: "Track items with checkboxes",
      keywords: ["todo", "task", "checkbox", "check"],
      icon: ListChecks,
      hint: "[ ]",
      run: (e, r) => chain(e, r).toggleTaskList().run(),
    },
    {
      id: "quote",
      title: "Quote",
      description: "Capture a quotation",
      keywords: ["blockquote", "citation"],
      icon: Quote,
      hint: ">",
      run: (e, r) => chain(e, r).toggleBlockquote().run(),
    },
    {
      id: "code",
      title: "Code block",
      description: "Monospaced code snippet",
      keywords: ["pre", "snippet", "codeblock"],
      icon: Code2,
      hint: "```",
      run: (e, r) => chain(e, r).toggleCodeBlock().run(),
    },
    {
      id: "divider",
      title: "Divider",
      description: "Horizontal line",
      keywords: ["hr", "separator", "rule", "line"],
      icon: Minus,
      hint: "---",
      run: (e, r) => chain(e, r).setHorizontalRule().run(),
    },
    {
      id: "image",
      title: "Image",
      description: "Upload from your computer",
      keywords: ["picture", "photo", "upload", "img"],
      icon: ImagePlus,
      run: (e, r) => {
        if (r) e.chain().focus().deleteRange(r).run();
        opts.pickImage();
      },
    },
  ];
}

export function filterCommands(items: BlockCommand[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (c) => c.title.toLowerCase().includes(q) || c.keywords.some((k) => k.startsWith(q)),
  );
}
