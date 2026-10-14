import { describe, expect, it } from "vitest";
import {
  bedtimeForWake,
  guidanceForAge,
  sessionNeedsCorrection,
  statusForSession,
  validateSessionTimes,
  weeklySleepStats,
  type CompletedSession,
} from "../src/lib/sleep";
import { dayPartsInTz } from "../src/lib/time";

const utc = (d: Date) => {
  const p = dayPartsInTz("UTC", d);
  return { minutesAfterMidnight: p.hour * 60 + p.minute, dateIso: p.iso };
};

describe("validateSessionTimes", () => {
  it("accepts a session crossing midnight", () => {
    const start = new Date("2024-01-01T23:15:00Z");
    const end = new Date("2024-01-02T06:45:00Z");
    const res = validateSessionTimes(start, end, new Date("2024-01-02T08:00:00Z"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.durationMinutes).toBe(450);
  });

  it("rejects end before start", () => {
    const res = validateSessionTimes(
      new Date("2024-01-02T08:00:00Z"),
      new Date("2024-01-01T23:00:00Z"),
      new Date("2024-01-02T12:00:00Z"),
    );
    expect(res.ok).toBe(false);
  });

  it("rejects sessions longer than 20 hours as impossible", () => {
    const start = new Date("2024-01-01T20:00:00Z");
    const end = new Date("2024-01-03T08:00:00Z"); // 36h later
    const res = validateSessionTimes(start, end, new Date("2024-01-03T09:00:00Z"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/20 hours/);
  });

  it("rejects sessions ending in the future", () => {
    const start = new Date("2024-01-01T23:00:00Z");
    const end = new Date("2024-01-02T07:00:00Z");
    const res = validateSessionTimes(start, end, new Date("2024-01-02T06:00:00Z"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/future/);
  });

  it("rejects sub-5-minute sessions", () => {
    const start = new Date("2024-01-02T07:00:00Z");
    const end = new Date("2024-01-02T07:03:00Z");
    const res = validateSessionTimes(start, end, new Date("2024-01-02T08:00:00Z"));
    expect(res.ok).toBe(false);
  });
});

describe("statusForSession", () => {
  it("uses the configured target, with clear thresholds", () => {
    expect(statusForSession(480, 480)).toBe("met"); // exactly on target
    expect(statusForSession(436, 480)).toBe("met"); // within -45m
    expect(statusForSession(434, 480)).toBe("short");
    expect(statusForSession(361, 480)).toBe("short"); // lower amber boundary
    expect(statusForSession(359, 480)).toBe("very_short");
    expect(statusForSession(571, 480)).toBe("over");
    expect(statusForSession(569, 480)).toBe("met"); // within +90m
  });

  it("never applies a universal rule when no target exists", () => {
    expect(statusForSession(300, null)).toBeNull();
    expect(statusForSession(600, null)).toBeNull();
  });
});

describe("bedtimeForWake", () => {
  it("subtracts the target and wraps past midnight", () => {
    expect(bedtimeForWake("07:00", 480)).toBe("23:00");
    expect(bedtimeForWake("06:30", 540)).toBe("21:30");
    expect(bedtimeForWake("23:30", 480)).toBe("15:30");
  });
});

describe("guidanceForAge", () => {
  it("varies by age group instead of assuming 8h for everyone", () => {
    expect(guidanceForAge("a13_17").recommendedMinutes).toBe(540);
    expect(guidanceForAge("a65p").recommendedMinutes).toBe(450);
    expect(guidanceForAge("a25_34").recommendedMinutes).toBe(480);
  });
});

describe("weeklySleepStats", () => {
  const sessions: CompletedSession[] = [
    { startedAt: new Date("2024-01-08T23:00:00Z"), endedAt: new Date("2024-01-09T07:00:00Z"), durationMinutes: 480 },
    { startedAt: new Date("2024-01-07T23:10:00Z"), endedAt: new Date("2024-01-08T06:50:00Z"), durationMinutes: 430 },
    { startedAt: new Date("2024-01-06T00:20:00Z"), endedAt: new Date("2024-01-06T07:20:00Z"), durationMinutes: 420 }, // started after midnight
    { startedAt: new Date("2024-01-01T23:30:00Z"), endedAt: new Date("2024-01-02T06:30:00Z"), durationMinutes: 420 }, // previous week
  ];

  it("buckets by the local evening date and averages real sessions only", () => {
    const stats = weeklySleepStats(sessions, utc, "2024-01-08");
    expect(stats.nightsTracked).toBe(3);
    expect(stats.averageMinutes).toBe(Math.round((480 + 430 + 420) / 3));
    expect(stats.prevAverageMinutes).toBe(420);
  });

  it("reports consistency only with at least 3 nights", () => {
    const stats = weeklySleepStats(sessions, utc, "2024-01-08");
    expect(stats.bedtimeConsistency).not.toBeNull();
    const twoNights = weeklySleepStats(sessions.slice(0, 2), utc, "2024-01-08");
    expect(twoNights.bedtimeConsistency).toBeNull();
  });

  it("handles missing data honestly", () => {
    const stats = weeklySleepStats([], utc, "2024-01-08");
    expect(stats.nightsTracked).toBe(0);
    expect(stats.averageMinutes).toBeNull();
    expect(stats.prevAverageMinutes).toBeNull();
  });
});

describe("sessionNeedsCorrection", () => {
  it("flags suspiciously long tracked sessions", () => {
    expect(sessionNeedsCorrection(17 * 60)).toBe(true);
    expect(sessionNeedsCorrection(8 * 60)).toBe(false);
  });
});
