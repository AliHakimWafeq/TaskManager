import { describe, expect, it } from "vitest";
import { isOverdue, toIsoDate, todayIso } from "@/lib/dates";

describe("dates", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("flags overdue only for open tasks with a past date", () => {
    expect(isOverdue("2000-01-01", false)).toBe(true);
    expect(isOverdue("2000-01-01", true)).toBe(false);
    expect(isOverdue(todayIso(), false)).toBe(false);
    expect(isOverdue(null, false)).toBe(false);
  });
});
