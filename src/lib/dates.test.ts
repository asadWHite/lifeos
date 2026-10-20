import { describe, expect, it } from "vitest";
import {
  addDays, diffDays, isLeapYear, isValidDateString, isValidTimeString, listDatesBetween,
  monthLength, nowMinutesInTz, parseTimeToMin, todayInTz, weekdayOf,
} from "@/lib/dates";

describe("dates", () => {
  it("validates date strings strictly", () => {
    expect(isValidDateString("2025-02-28")).toBe(true);
    expect(isValidDateString("2024-02-29")).toBe(true); // leap
    expect(isValidDateString("2023-02-29")).toBe(false); // not leap
    expect(isValidDateString("2025-13-01")).toBe(false);
    expect(isValidDateString("2025-00-10")).toBe(false);
    expect(isValidDateString("25-01-01")).toBe(false);
    expect(isValidDateString("")).toBe(false);
    expect(isValidDateString(null)).toBe(false);
  });

  it("validates time strings", () => {
    expect(isValidTimeString("00:00")).toBe(true);
    expect(isValidTimeString("23:59")).toBe(true);
    expect(isValidTimeString("24:00")).toBe(false);
    expect(isValidTimeString("9:30")).toBe(false);
    expect(isValidTimeString("12:60")).toBe(false);
  });

  it("leap years and month lengths", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(monthLength(2024, 2)).toBe(29);
    expect(monthLength(2023, 2)).toBe(28);
    expect(monthLength(2025, 1)).toBe(31);
    expect(monthLength(2025, 4)).toBe(30);
  });

  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2023-02-28", 1)).toBe("2023-03-01");
    expect(addDays("2024-12-31", 1)).toBe("2025-01-01");
    expect(addDays("2025-01-01", -1)).toBe("2024-12-31");
  });

  it("diffDays", () => {
    expect(diffDays("2025-01-01", "2025-01-10")).toBe(9);
    expect(diffDays("2025-01-10", "2025-01-01")).toBe(-9);
    expect(diffDays("2025-01-01", "2025-01-01")).toBe(0);
  });

  it("listDatesBetween inclusive", () => {
    expect(listDatesBetween("2025-03-01", "2025-03-03")).toEqual(["2025-03-01", "2025-03-02", "2025-03-03"]);
    expect(listDatesBetween("2025-03-03", "2025-03-01")).toEqual([]);
    expect(listDatesBetween("bad", "2025-03-01")).toEqual([]);
  });

  it("weekdayOf", () => {
    expect(weekdayOf("2025-01-05")).toBe(0); // Sunday
    expect(weekdayOf("2025-01-06")).toBe(1); // Monday
  });

  it("timezone-aware today", () => {
    // 2025-06-01 22:30 UTC == 2025-06-02 03:30 in Asia/Tashkent (+5)
    const now = new Date("2025-06-01T22:30:00Z");
    expect(todayInTz("Asia/Tashkent", now)).toBe("2025-06-02");
    expect(todayInTz("America/New_York", now)).toBe("2025-06-01");
    expect(nowMinutesInTz("Asia/Tashkent", now)).toBe(3 * 60 + 30);
  });

  it("parseTimeToMin", () => {
    expect(parseTimeToMin("00:00")).toBe(0);
    expect(parseTimeToMin("07:30")).toBe(450);
    expect(parseTimeToMin("24:00")).toBeNull();
    expect(parseTimeToMin(null)).toBeNull();
    expect(parseTimeToMin("x")).toBeNull();
  });
});
