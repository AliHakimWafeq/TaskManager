import { describe, expect, it } from "vitest";
import { docToMarkdown, markdownToDoc } from "@/lib/editor/markdown";

const types = (json: string) => {
  const out: string[] = [];
  const walk = (n: { type: string; marks?: { type: string }[]; content?: unknown[] }) => {
    out.push(n.type);
    n.marks?.forEach((m) => out.push(`mark:${m.type}`));
    (n.content as (typeof n)[] | undefined)?.forEach(walk);
  };
  walk(JSON.parse(json));
  return out;
};

describe("markdown <-> tiptap", () => {
  it("parses every supported block and mark", () => {
    const md = [
      "## Heading",
      "",
      "**b** *i* ++u++ ~~s~~ ==h== `c` [l](https://x.dev)",
      "",
      "- [ ] todo",
      "",
      "1. one",
      "",
      "> quote",
      "",
      "```ts\nconst a = 1;\n```",
      "",
      "---",
      "",
      "![alt](/api/uploads/abc.png)",
    ].join("\n");
    const t = types(markdownToDoc(md));
    for (const expected of [
      "heading", "mark:bold", "mark:italic", "mark:underline", "mark:strike", "mark:highlight",
      "mark:code", "mark:link", "taskList", "taskItem", "orderedList", "blockquote", "codeBlock",
      "horizontalRule", "image",
    ]) {
      expect(t).toContain(expected);
    }
  });

  it("round-trips without losing formatting", () => {
    const md = "## Plan\n\nShip **fast** with ++care++.\n\n- [x] done\n- [ ] next";
    expect(docToMarkdown(markdownToDoc(md))).toBe(md);
  });

  it("passes legacy plain-text descriptions through", () => {
    expect(docToMarkdown("not json")).toBe("not json");
    expect(docToMarkdown(null)).toBe("");
  });
});
