import { describe, expect, it } from "vitest";
import { formatIdentifier, parseIdentifier, suggestProjectKey } from "@/lib/identifiers";

describe("identifiers", () => {
  it("formats key and number", () => {
    expect(formatIdentifier("WEB", 12)).toBe("WEB-12");
  });

  it("parses valid identifiers case-insensitively", () => {
    expect(parseIdentifier("web-12")).toEqual({ key: "WEB", number: 12 });
    expect(parseIdentifier(" A1B2C-7 ")).toEqual({ key: "A1B2C", number: 7 });
  });

  it("rejects malformed identifiers", () => {
    expect(parseIdentifier("WEB12")).toBeNull();
    expect(parseIdentifier("1AB-3")).toBeNull();
    expect(parseIdentifier("TOOLONG-3")).toBeNull();
    expect(parseIdentifier("WEB-")).toBeNull();
  });

  it("suggests keys from names", () => {
    expect(suggestProjectKey("Web App")).toBe("WA");
    expect(suggestProjectKey("Marketing")).toBe("MAR");
    expect(suggestProjectKey("Mobile iOS App Rewrite Project")).toBe("MIARP");
    expect(suggestProjectKey("2024 Roadmap")).toBe("P2R");
    expect(suggestProjectKey("")).toBe("XX");
  });
});
