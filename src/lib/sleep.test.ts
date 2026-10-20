import { describe, expect, it } from "vitest";
import { complianceStatus, sessionDurationMin, targetSleepMin, wakeDeltaMin } from "@/lib/sleep";

describe("sleep duration", () => {
  it("computes minutes between start and end (crossing midnight)", () => {
    const start = new Date("2025-03-03T23:30:00Z");
    const end = new Date("2025-03-04T07:15:00Z");
    expect(sessionDurationMin(start, end)).toBe(465);
  });
  it("returns null for active or invalid sessions", () => {
    expect(sessionDurationMin(new Date(), null)).toBeNull();
    expect(sessionDurationMin(new Date("2025-03-04T10:00:00Z"), new Date("2025-03-04T09:00:00Z"))).toBeNull();
  });
});

describe("compliance rules", () => {
  const base = { targetWakeTime: "07:00", toleranceMin: 15 };

  it("green within ±tolerance", () => {
    expect(complianceStatus({ durationMin: 470, actualWakeMin: 7 * 60 + 10, ...base })).toBe("green");
    expect(complianceStatus({ durationMin: 470, actualWakeMin: 6 * 60 + 50, ...base })).toBe("green");
  });

  it("yellow 15–60 min late", () => {
    expect(complianceStatus({ durationMin: 470, actualWakeMin: 7 * 60 + 45, ...base })).toBe("yellow");
  });

  it("red when more than 60 min late", () => {
    expect(complianceStatus({ durationMin: 470, actualWakeMin: 8 * 60 + 30, ...base })).toBe("red");
  });

  it("red when duration below 2 hours even with perfect wake time", () => {
    expect(complianceStatus({ durationMin: 90, actualWakeMin: 7 * 60, ...base })).toBe("red");
  });

  it("none when required data is missing — never treated as success", () => {
    expect(complianceStatus({ durationMin: null, actualWakeMin: 7 * 60, ...base })).toBe("none");
    expect(complianceStatus({ durationMin: 470, actualWakeMin: null, ...base })).toBe("none");
    expect(complianceStatus({ durationMin: 470, actualWakeMin: 7 * 60, targetWakeTime: null })).toBe("none");
    expect(complianceStatus({ durationMin: 470, actualWakeMin: 7 * 60, targetWakeTime: undefined, toleranceMin: null })).toBe("none");
  });

  it("respects configurable tolerance", () => {
    expect(complianceStatus({ durationMin: 470, actualWakeMin: 7 * 60 + 25, targetWakeTime: "07:00", toleranceMin: 30 })).toBe("green");
    expect(complianceStatus({ durationMin: 470, actualWakeMin: 7 * 60 + 25, targetWakeTime: "07:00", toleranceMin: 10 })).toBe("yellow");
  });

  it("wakeDeltaMin normalizes around midnight", () => {
    expect(wakeDeltaMin(60, 23 * 60)).toBe(120); // 01:00 vs 23:00 => +2h
    expect(wakeDeltaMin(23 * 60, 60)).toBe(-120);
  });
});

describe("target sleep", () => {
  it("handles cross-midnight schedules", () => {
    expect(targetSleepMin("23:00", "07:00")).toBe(480);
    expect(targetSleepMin("01:00", "09:30")).toBe(510);
  });
  it("rejects invalid input", () => {
    expect(targetSleepMin("bad", "07:00")).toBeNull();
  });
});
