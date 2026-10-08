import { describe, expect, it } from "vitest";
import { filterCommands, blockCommands } from "@/components/editor/commands";
import { likePattern } from "@/lib/filters";

describe("likePattern", () => {
  it("escapes LIKE wildcards and backslashes", () => {
    expect(likePattern("50%")).toBe("%50\\%%");
    expect(likePattern("my_var")).toBe("%my\\_var%");
    expect(likePattern("a\\b")).toBe("%a\\\\b%");
  });
});

describe("slash menu filtering", () => {
  const items = blockCommands({ pickImage: () => {} });
  it("matches titles and keyword prefixes", () => {
    expect(filterCommands(items, "").length).toBe(items.length);
    expect(filterCommands(items, "head").map((i) => i.id)).toEqual(["h1", "h2", "h3"]);
    expect(filterCommands(items, "todo").map((i) => i.id)).toEqual(["todo"]);
    expect(filterCommands(items, "hr").map((i) => i.id)).toEqual(["divider"]);
    expect(filterCommands(items, "zzz")).toEqual([]);
  });
});
