import { describe, expect, it } from "vitest";
import {
  habitConsistency, isOverdueWithinDay, overdueTasks, pickCurrentActivity, pickNextActivity,
  sortForTimeline, summarizeToday, weeklySeries, type TaskLike,
} from "@/lib/stats";

const T = (date: string, status = "pending"): TaskLike => ({ date, status });

describe("task statistics", () => {
  it("summarizeToday counts only today's tasks with correct denominator", () => {
    const tasks = [T("2025-05-10", "completed"), T("2025-05-10", "completed"), T("2025-05-10"), T("2025-05-09", "completed")];
    const s = summarizeToday(tasks, "2025-05-10");
    expect(s).toEqual({ total: 3, done: 2, pct: 67 });
  });

  it("empty day yields 0% not NaN", () => {
    expect(summarizeToday([], "2025-05-10")).toEqual({ total: 0, done: 0, pct: 0 });
  });

  it("overdue = pending with date before today", () => {
    const tasks = [T("2025-05-01"), T("2025-05-01", "completed"), T("2025-05-11")];
    expect(overdueTasks(tasks, "2025-05-10").length).toBe(1);
  });

  it("weeklySeries spans the right window and matches totals", () => {
    const tasks = [T("2025-05-10", "completed"), T("2025-05-10"), T("2025-05-08", "completed")];
    const series = weeklySeries(tasks, "2025-05-10", 7);
    expect(series.length).toBe(7);
    expect(series[0].date).toBe("2025-05-04");
    expect(series[6]).toEqual({ date: "2025-05-10", total: 2, done: 1 });
  });
});

describe("habit consistency", () => {
  it("divides completions by scheduled occurrences only", () => {
    // Mon/Wed/Fri habit; 2025-05-05(Mon) → 2025-05-11(Sun): Mon5 Wed7 Fri9 => 3 occurrences
    const done = new Set(["2025-05-05", "2025-05-09"]);
    const c = habitConsistency(done, [1, 3, 5], "2025-05-05", "2025-05-11");
    expect(c).toEqual({ scheduled: 3, completed: 2, pct: 67 });
  });
  it("zero occurrences → 0%", () => {
    const c = habitConsistency(new Set(), [0], "2025-05-05", "2025-05-11");
    expect(c.pct).toBe(0);
  });
});

describe("timeline ordering & selection", () => {
  const mk = (startTime: string | null, extra?: Partial<{ endTime: string | null; status: string }>) => ({
    startTime, endTime: extra?.endTime ?? null, status: extra?.status ?? "pending",
  });

  it("sorts chronologically with anytime tasks last", () => {
    const items = [mk(null), mk("09:00"), mk("07:30")];
    const sorted = sortForTimeline(items);
    expect(sorted[0].startTime).toBe("07:30");
    expect(sorted[2].startTime).toBeNull();
  });

  it("current activity = pending interval containing now", () => {
    const items = [mk("09:00", { endTime: "10:00" }), mk("12:00")];
    const cur = pickCurrentActivity(items, 9 * 60 + 30);
    expect(cur?.startTime).toBe("09:00");
    expect(pickCurrentActivity(items, 11 * 60)).toBeNull();
  });

  it("completed activities are never current or next", () => {
    const items = [mk("09:00", { endTime: "10:00", status: "completed" }), mk("12:30")];
    expect(pickCurrentActivity(items, 9 * 60 + 30)).toBeNull();
    expect(pickNextActivity(items, 9 * 60)?.startTime).toBe("12:30");
  });

  it("next = first pending timed task after now", () => {
    const items = [mk("07:00"), mk("13:00"), mk("09:00")];
    expect(pickNextActivity(items, 10 * 60)?.startTime).toBe("13:00");
    expect(pickNextActivity(items, 14 * 60)).toBeNull();
  });

  it("overdue within day", () => {
    expect(isOverdueWithinDay(mk("09:00", { endTime: "10:00" }), 11 * 60)).toBe(true);
    expect(isOverdueWithinDay(mk("09:00", { endTime: "10:00", status: "completed" }), 11 * 60)).toBe(false);
    expect(isOverdueWithinDay(mk(null), 23 * 60)).toBe(false);
  });
});
