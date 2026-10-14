/**
 * Sleep domain logic — pure functions so they can be unit tested.
 *
 * All durations are user-reported estimates, never sensor measurements.
 * Guidance ranges align with widely published duration recommendations
 * (e.g. National Sleep Foundation ranges). They are informational only —
 * this module never produces medical advice or diagnoses.
 */

export const MIN_SESSION_MINUTES = 5;
export const MAX_SESSION_MINUTES = 20 * 60; // 20h — beyond this we require manual correction
export const NEEDS_CORRECTION_MINUTES = 16 * 60; // sessions longer than this suggest a forgotten stop

export type AgeGroup =
  | "u13"
  | "a13_17"
  | "a18_24"
  | "a25_34"
  | "a35_49"
  | "a50_64"
  | "a65p"
  | null;

export type SleepGuidance = {
  minMinutes: number;
  maxMinutes: number;
  recommendedMinutes: number;
  label: string;
};

/** Evidence-informed duration ranges by age group (informational, not medical). */
export function guidanceForAge(ageGroup: AgeGroup): SleepGuidance {
  switch (ageGroup) {
    case "u13": // ~6–12 years
      return { minMinutes: 540, maxMinutes: 720, recommendedMinutes: 600, label: "9–12 hours" };
    case "a13_17":
      return { minMinutes: 480, maxMinutes: 600, recommendedMinutes: 540, label: "8–10 hours" };
    case "a65p":
      return { minMinutes: 420, maxMinutes: 480, recommendedMinutes: 450, label: "7–8 hours" };
    case "a18_24":
    case "a25_34":
    case "a35_49":
    case "a50_64":
    default:
      return { minMinutes: 420, maxMinutes: 540, recommendedMinutes: 480, label: "7–9 hours" };
  }
}

export type SessionTimes = { ok: true; durationMinutes: number } | { ok: false; error: string };

/**
 * Validate a proposed start/end pair. Used for manual corrections and for
 * completing tracked sessions. Rules:
 *  - end must be after start
 *  - duration between 5 minutes and 20 hours
 *  - end may not be (far) in the future
 */
export function validateSessionTimes(start: Date, end: Date, now: Date = new Date()): SessionTimes {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, error: "Invalid date or time." };
  }
  const duration = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (duration < MIN_SESSION_MINUTES) {
    return { ok: false, error: "Sleep end must be at least 5 minutes after the start." };
  }
  if (duration > MAX_SESSION_MINUTES) {
    return {
      ok: false,
      error: "That session is over 20 hours. Please correct the times manually to reflect the actual time in bed.",
    };
  }
  if (end.getTime() - now.getTime() > 10 * 60_000) {
    return { ok: false, error: "Sleep cannot end in the future." };
  }
  return { ok: true, durationMinutes: duration };
}

/** True when a freshly-stopped session is suspiciously long (probably forgotten). */
export function sessionNeedsCorrection(durationMinutes: number): boolean {
  return durationMinutes > NEEDS_CORRECTION_MINUTES;
}

export type SleepStatus = "met" | "short" | "very_short" | "over";

export const STATUS_COPY: Record<
  SleepStatus,
  { label: string; tone: "green" | "amber" | "red" }
> = {
  met: { label: "Within your target", tone: "green" },
  short: { label: "Somewhat short", tone: "amber" },
  very_short: { label: "Well short", tone: "red" },
  over: { label: "Longer than target", tone: "amber" },
};

/**
 * Classify a session against the user's *configured* target.
 * Green only while inside [target - 45m, target + 90m].
 * Returns null when no target is configured — we never guess.
 */
export function statusForSession(
  durationMinutes: number,
  targetMinutes: number | null,
): SleepStatus | null {
  if (!targetMinutes || targetMinutes <= 0) return null;
  if (durationMinutes > targetMinutes + 90) return "over";
  if (durationMinutes >= targetMinutes - 45) return "met";
  if (durationMinutes >= targetMinutes - 120) return "short";
  return "very_short";
}

/** Suggest a bedtime ("HH:MM") given a desired wake time and target duration. */
export function bedtimeForWake(wakeTime: string, targetMinutes: number): string {
  const [h, m] = wakeTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "23:00";
  let total = h * 60 + m - targetMinutes;
  while (total < 0) total += 24 * 60;
  total = total % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export type CompletedSession = {
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
};

/** Offset of a clock time from 18:00, wrapping past-midnight times forward. */
function eveningOffsetMinutes(clockMinutesAfterMidnight: number): number {
  let m = clockMinutesAfterMidnight;
  if (m < 12 * 60) m += 24 * 60; // 00:00–11:59 counts as "after midnight"
  return m - 18 * 60;
}

export function stdDev(values: number[]): number | null {
  if (values.length < 3) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance));
}

type LocalClock = { minutesAfterMidnight: number; dateIso: string };

export type SleepStats = {
  nightsTracked: number;
  averageMinutes: number | null;
  prevAverageMinutes: number | null;
  bedtimeConsistency: number | null; // std-dev minutes of bedtimes (≥3 nights)
  wakeConsistency: number | null;
};

/**
 * Weekly sleep statistics. Sessions are bucketed by the *local date on which
 * they started* so that a session crossing midnight belongs to its evening,
 * which is how people think about "last night".
 */
export function weeklySleepStats(
  sessions: CompletedSession[],
  toLocal: (d: Date) => LocalClock,
  todayIso: string,
): SleepStats {
  const completed = sessions.filter((s) => s.durationMinutes != null) as Array<
    CompletedSession & { durationMinutes: number }
  >;

  const inWindow = (iso: string, from: string, to: string) => iso >= from && iso <= to;
  const shift = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const thisWeek = completed.filter((s) =>
    inWindow(toLocal(s.startedAt).dateIso, shift(todayIso, -6), todayIso),
  );
  const prevWeek = completed.filter((s) =>
    inWindow(toLocal(s.startedAt).dateIso, shift(todayIso, -13), shift(todayIso, -7)),
  );

  const avg = (rows: Array<{ durationMinutes: number }>) =>
    rows.length === 0
      ? null
      : Math.round(rows.reduce((a, r) => a + r.durationMinutes, 0) / rows.length);

  const bedtimes = thisWeek.map((s) => eveningOffsetMinutes(toLocal(s.startedAt).minutesAfterMidnight));
  const wakes = thisWeek
    .filter((s) => s.endedAt)
    .map((s) => toLocal(s.endedAt as Date).minutesAfterMidnight);

  return {
    nightsTracked: thisWeek.length,
    averageMinutes: avg(thisWeek),
    prevAverageMinutes: avg(prevWeek),
    bedtimeConsistency: stdDev(bedtimes),
    wakeConsistency: stdDev(wakes),
  };
}
