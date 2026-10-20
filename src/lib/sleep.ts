import { parseTimeToMin } from "@/lib/dates";

/* Sleep schedule compliance rules (implemented exactly as documented here):
 *
 * - "none"   : required data missing (no recorded wake time or no target).
 *              Missing data is never treated as compliance.
 * - "red"    : recorded sleep duration below MIN_VALID_DURATION_MIN (2h),
 *              regardless of wake-time accuracy. Also red when waking more
 *              than LATE_RED_MIN (60 min) after the target wake time.
 * - "yellow" : waking later than the green tolerance but no more than
 *              LATE_RED_MIN after the target wake time (≈30–60 min late).
 * - "green"  : waking within ±toleranceMin of the target (default 15 min).
 *
 * These are schedule-consistency signals, not a medical assessment. */

export const MIN_VALID_DURATION_MIN = 120;
export const LATE_RED_MIN = 60;
export const DEFAULT_TOLERANCE_MIN = 15;

export type SleepStatus = "green" | "yellow" | "red" | "none";

export function sessionDurationMin(startedAt: Date, endedAt: Date | null): number | null {
  if (!endedAt) return null;
  const ms = endedAt.getTime() - startedAt.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 60_000);
}

function normalizeDelta(delta: number): number {
  // Map to (-720, 720] so cross-midnight comparisons stay sane.
  return ((((delta + 720) % 1440) + 1440) % 1440) - 720;
}

export function wakeDeltaMin(actualWakeMin: number, targetWakeMin: number): number {
  return normalizeDelta(actualWakeMin - targetWakeMin);
}

export function complianceStatus(args: {
  durationMin: number | null;
  actualWakeMin: number | null;
  targetWakeTime: string | null | undefined;
  toleranceMin?: number | null;
}): SleepStatus {
  const { durationMin, actualWakeMin, targetWakeTime } = args;
  const targetMin = parseTimeToMin(targetWakeTime ?? null);
  const tolerance = args.toleranceMin ?? DEFAULT_TOLERANCE_MIN;

  if (durationMin == null || actualWakeMin == null || targetMin == null) return "none";
  if (durationMin < 0) return "none";
  if (durationMin < MIN_VALID_DURATION_MIN) return "red";

  const late = wakeDeltaMin(actualWakeMin, targetMin);
  if (late > LATE_RED_MIN) return "red";
  if (late > tolerance) return "yellow";
  return "green";
}

export const STATUS_LABEL: Record<SleepStatus, string> = {
  green: "On schedule",
  yellow: "Slightly late",
  red: "Off track",
  none: "No comparison",
};

/** Local HH:MM of a Date in the user's timezone. */
export function minutesOfDayInTz(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return parseTimeToMin(parts) ?? 0;
}

/** Suggested target sleep duration in minutes from bed → wake (handles cross-midnight). */
export function targetSleepMin(bedtime: string, wakeTime: string): number | null {
  const bed = parseTimeToMin(bedtime);
  const wake = parseTimeToMin(wakeTime);
  if (bed == null || wake == null) return null;
  return ((wake - bed) % 1440 + 1440) % 1440;
}
