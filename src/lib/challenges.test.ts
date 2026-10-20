import { describe, expect, it } from "vitest";
import { challengeWindow, evaluateChallenge } from "@/lib/challenges";
import { earnedKeys, ACHIEVEMENTS } from "@/lib/achievements";
import type { StatsSnapshot } from "@/lib/stats";

const snap = (over: Partial<StatsSnapshot> = {}): StatsSnapshot => ({
  tasksCompleted: 0, currentTaskStreak: 0, longestTaskStreak: 0, habitCompletions: 0,
  bestHabitStreak: 0, sleepSessions: 0, greenSleepSessions: 0, goalsCompleted: 0,
  challengesCompleted: [], ...over,
});

describe("challenge windows", () => {
  it("ten-day window is 10 consecutive days from today", () => {
    const w = challengeWindow({ type: "ten_day" }, "2025-06-05");
    expect(w).toEqual({ startDate: "2025-06-05", endDate: "2025-06-14", targetDays: 10 });
  });

  it("monthly windows respect month length and leap years", () => {
    expect(challengeWindow({ type: "monthly", month: 2, year: 2024 }, "2024-02-10").endDate).toBe("2024-02-29");
    expect(challengeWindow({ type: "monthly", month: 2, year: 2023 }, "2023-02-10").endDate).toBe("2023-02-28");
    expect(challengeWindow({ type: "monthly", month: 12, year: 2025 }, "2025-12-01").endDate).toBe("2025-12-31");
    expect(challengeWindow({ type: "monthly", month: 12, year: 2025 }, "2025-12-01").targetDays).toBe(31);
  });
});

describe("challenge evaluation", () => {
  const ch = { type: "ten_day", startDate: "2025-06-01", endDate: "2025-06-10", targetDays: 10 };

  it("completes only when every day is counted", () => {
    const all = new Set(["2025-06-01", "2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09", "2025-06-10"]);
    const p = evaluateChallenge(ch, all, "2025-06-10");
    expect(p.state).toBe("completed");
    expect(p.countedDays).toBe(10);
  });

  it("never completes early", () => {
    const nine = new Set(["2025-06-01", "2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09"]);
    const p = evaluateChallenge(ch, nine, "2025-06-09");
    expect(p.state).not.toBe("completed");
  });

  it("a fully elapsed day without completion fails the challenge", () => {
    const some = new Set(["2025-06-01"]);
    const p = evaluateChallenge(ch, some, "2025-06-03");
    expect(p.state).toBe("failed");
    expect(p.missedDays).toEqual(["2025-06-02"]);
  });

  it("the running day is still in play (no failure for today)", () => {
    const some = new Set(["2025-06-01", "2025-06-02"]);
    const p = evaluateChallenge(ch, some, "2025-06-03");
    expect(p.state).toBe("active");
    expect(p.missedDays).toEqual([]);
  });

  it("historical windows resolve deterministically", () => {
    const past = { type: "monthly", startDate: "2025-01-01", endDate: "2025-01-31", targetDays: 31 };
    const partial = new Set(["2025-01-01", "2025-01-02"]);
    expect(evaluateChallenge(past, partial, "2025-06-01").state).toBe("failed");
    const none = new Set<string>();
    expect(evaluateChallenge(past, none, "2025-06-01").missedDays.length).toBe(31);
  });
});

describe("achievement rules", () => {
  it("no awards on a brand-new account", () => {
    expect(earnedKeys(snap())).toEqual([]);
  });

  it("first task award at exactly one completed task", () => {
    expect(earnedKeys(snap({ tasksCompleted: 1 }))).toContain("first_task");
    expect(earnedKeys(snap({ tasksCompleted: 1 }))).not.toContain("ten_tasks");
  });

  it("streak awards use best of current and longest", () => {
    expect(earnedKeys(snap({ tasksCompleted: 10, longestTaskStreak: 7 }))).toEqual(expect.arrayContaining(["streak_3", "streak_7"]));
  });

  it("challenge awards require completed challenges", () => {
    expect(earnedKeys(snap({ challengesCompleted: ["ten_day"] }))).toContain("challenge_10");
    expect(earnedKeys(snap({ challengesCompleted: [] }))).not.toContain("challenge_10");
    expect(earnedKeys(snap({ challengesCompleted: ["monthly"] }))).toContain("challenge_month");
  });

  it("every catalog entry has a reachable requirement", () => {
    const everything = snap({
      tasksCompleted: 100, currentTaskStreak: 30, longestTaskStreak: 30, habitCompletions: 40,
      bestHabitStreak: 21, sleepSessions: 20, greenSleepSessions: 10, goalsCompleted: 3,
      challengesCompleted: ["ten_day", "monthly"],
    });
    expect(new Set(earnedKeys(everything))).toEqual(new Set(ACHIEVEMENTS.map((a) => a.key)));
  });
});
