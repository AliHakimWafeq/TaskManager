import { describe, expect, it } from "vitest";
import { addDaysIso, daysBetween, formatDue, isOverdue, toIsoDate, todayIso } from "@/lib/dates";

describe("dates", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("computes today in a given time zone", () => {
    const instant = new Date("2026-10-08T22:30:00Z");
    expect(todayIso("UTC", instant)).toBe("2026-10-08");
    expect(todayIso("Asia/Riyadh", instant)).toBe("2026-10-09");
    expect(todayIso("America/Los_Angeles", instant)).toBe("2026-10-08");
    expect(todayIso("Not/AZone", instant)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("does day arithmetic on strings", () => {
    expect(addDaysIso("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysBetween("2026-03-01", "2026-02-27")).toBe(-2);
  });

  it("formats due dates relative to today", () => {
    const today = "2026-10-08";
    expect(formatDue("2026-10-08", today)).toBe("Today");
    expect(formatDue("2026-10-09", today)).toBe("Tomorrow");
    expect(formatDue("2026-10-07", today)).toBe("Yesterday");
    expect(formatDue("2026-10-20", today)).toBe("Oct 20");
    expect(formatDue("2027-01-02", today)).toBe("Jan 2, 2027");
  });

  it("flags overdue only for open tasks with a past date", () => {
    const today = "2026-10-08";
    expect(isOverdue("2026-10-07", false, today)).toBe(true);
    expect(isOverdue("2026-10-07", true, today)).toBe(false);
    expect(isOverdue(today, false, today)).toBe(false);
    expect(isOverdue(null, false, today)).toBe(false);
  });
});
