import { describe, expect, it } from "vitest";
import { filterCommands, blockCommands } from "@/components/editor/commands";
import { likePattern, parseSearchQuery } from "@/lib/filters";

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

describe("parseSearchQuery", () => {
  it("recognises full ticket IDs in any case, with or without #", () => {
    expect(parseSearchQuery("BLB-104")).toEqual({ text: "BLB-104", key: "BLB", number: 104 });
    expect(parseSearchQuery(" blb-104 ")).toEqual({ text: "blb-104", key: "BLB", number: 104 });
    expect(parseSearchQuery("#WEB-7")).toMatchObject({ key: "WEB", number: 7 });
  });

  it("treats a bare number as a ticket number in any project", () => {
    expect(parseSearchQuery("104")).toEqual({ text: "104", key: null, number: 104 });
    expect(parseSearchQuery("#104")).toMatchObject({ key: null, number: 104 });
  });

  it("leaves other text as a title search", () => {
    expect(parseSearchQuery("login page")).toEqual({ text: "login page", key: null, number: null });
    expect(parseSearchQuery("BLB-")).toMatchObject({ number: null });
    expect(parseSearchQuery("v2-beta")).toMatchObject({ number: null });
  });
});
