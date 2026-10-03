import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseFilters } from "@/lib/filters";

describe("parseFilters", () => {
  it("returns empty filters by default", () => {
    const f = parseFilters({});
    expect(f).toEqual({ q: "", status: [], type: [], priority: [], label: [], project: [], due: null, sort: "manual" });
    expect(hasActiveFilters(f)).toBe(false);
  });

  it("splits comma lists and drops unknown enum values", () => {
    const f = parseFilters({ priority: "urgent,bogus,low", type: ["completed", "nope"], due: "overdue", sort: "priority" });
    expect(f.priority).toEqual(["urgent", "low"]);
    expect(f.type).toEqual(["completed"]);
    expect(f.due).toBe("overdue");
    expect(f.sort).toBe("priority");
    expect(hasActiveFilters(f)).toBe(true);
  });

  it("falls back for invalid due and sort", () => {
    const f = parseFilters({ due: "whenever", sort: "random", q: "  login " });
    expect(f.due).toBeNull();
    expect(f.sort).toBe("manual");
    expect(f.q).toBe("login");
  });
});
