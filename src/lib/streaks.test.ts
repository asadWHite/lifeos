import { describe, expect, it } from "vitest";
import { currentDayStreak, currentHabitStreak, longestDayStreak, longestHabitStreak } from "@/lib/streaks";

// 2025-01-08 is a Wednesday. week: Sun5 Mon6 Tue7 Wed8 Thu9 Fri10 Sat11
const EVERYDAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

describe("habit streaks", () => {
  it("counts consecutive scheduled completions ending today", () => {
    const done = new Set(["2025-01-06", "2025-01-07", "2025-01-08"]);
    expect(currentHabitStreak(done, EVERYDAY, "2025-01-08")).toBe(3);
  });

  it("today not yet completed does not break the streak", () => {
    const done = new Set(["2025-01-06", "2025-01-07"]); // today (8th) pending
    expect(currentHabitStreak(done, EVERYDAY, "2025-01-08")).toBe(2);
  });

  it("a missed scheduled day breaks the streak", () => {
    const done = new Set(["2025-01-05", "2025-01-07", "2025-01-08"]); // missed 6th
    expect(currentHabitStreak(done, EVERYDAY, "2025-01-08")).toBe(2);
  });

  it("rest days neither extend nor break streaks", () => {
    // Weekday-only habit: weekend of Jan 4-5 is rest.
    const done = new Set(["2025-01-03", "2025-01-06", "2025-01-07", "2025-01-08"]); // Fri + Mon-Wed
    expect(currentHabitStreak(done, WEEKDAYS, "2025-01-08")).toBe(4);
  });

  it("missing a weekday with rest-day neighbour breaks", () => {
    const done = new Set(["2025-01-03", "2025-01-07", "2025-01-08"]); // missed Mon 6th
    expect(currentHabitStreak(done, WEEKDAYS, "2025-01-08")).toBe(2);
  });

  it("returns 0 with no schedule or invalid dates", () => {
    expect(currentHabitStreak(new Set(), [], "2025-01-08")).toBe(0);
    expect(currentHabitStreak(new Set(["x"]), EVERYDAY, "not-a-date")).toBe(0);
  });

  it("longest streak finds historical best", () => {
    const done = new Set([
      "2025-01-01", "2025-01-02", "2025-01-03", // run of 3
      "2025-01-06", "2025-01-07", // run of 2
    ]);
    expect(longestHabitStreak(done, EVERYDAY, "2025-01-08")).toBe(3);
  });

  it("is deterministic for the same history", () => {
    const done = new Set(["2025-01-02", "2025-01-03", "2025-01-05", "2025-01-06"]);
    expect(currentHabitStreak(done, EVERYDAY, "2025-01-07")).toBe(currentHabitStreak(done, EVERYDAY, "2025-01-07"));
  });
});

describe("day streaks (tasks)", () => {
  it("current streak anchors on today when active", () => {
    const days = new Set(["2025-02-01", "2025-02-02", "2025-02-03"]);
    expect(currentDayStreak(days, "2025-02-03")).toBe(3);
  });

  it("anchors on yesterday when today has none yet", () => {
    const days = new Set(["2025-02-01", "2025-02-02"]);
    expect(currentDayStreak(days, "2025-02-03")).toBe(2);
  });

  it("gaps end the run", () => {
    const days = new Set(["2025-01-30", "2025-02-02", "2025-02-03"]);
    expect(currentDayStreak(days, "2025-02-03")).toBe(2);
  });

  it("longest day streak", () => {
    const days = new Set(["2025-01-01", "2025-01-02", "2025-01-04", "2025-01-05", "2025-01-06"]);
    expect(longestDayStreak(days)).toBe(3);
    expect(longestDayStreak(new Set())).toBe(0);
  });
});
