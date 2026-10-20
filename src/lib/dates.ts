/* Timezone-aware date utilities. All functions are pure and unit-tested.
 * Dates are "YYYY-MM-DD" strings in the user's timezone.
 * Times are "HH:MM" 24h strings. */

export const DEFAULT_TIMEZONE = "Asia/Tashkent";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDateString(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= monthLength(y, m);
}

export function isValidTimeString(s: unknown): s is string {
  return typeof s === "string" && TIME_RE.test(s);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function monthLength(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Today's date (YYYY-MM-DD) in the given IANA timezone. */
export function todayInTz(tz: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return todayInTz(DEFAULT_TIMEZONE, now);
  }
}

/** Minutes since midnight in the given timezone (0..1439). */
export function nowMinutesInTz(tz: string = DEFAULT_TIMEZONE, now: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now);
    return parseTimeToMin(parts) ?? 0;
  } catch {
    return 0;
  }
}

/** Current "HH:MM" in the given timezone. */
export function timeInTz(tz: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  const m = nowMinutesInTz(tz, now);
  return minToTime(m);
}

export function parseTimeToMin(t: string | null | undefined): number | null {
  if (!t || !TIME_RE.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  const wrapped = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 12-hour label e.g. "7:05 AM". */
export function timeLabel(t: string | null | undefined): string {
  const min = parseTimeToMin(t);
  if (min == null) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Add n days to a YYYY-MM-DD string. Uses UTC noon to avoid DST edges. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). Negative if b before a. */
export function diffDays(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.round((db - da) / 86_400_000);
}

/** Weekday of a date string, 0 = Sunday. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Inclusive list of date strings from start to end. Empty if invalid/inverted. */
export function listDatesBetween(start: string, end: string): string[] {
  if (!isValidDateString(start) || !isValidDateString(end)) return [];
  const n = diffDays(start, end);
  if (n < 0 || n > 732) return [];
  const out: string[] = [];
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

export function formatDuration(min: number): string {
  const abs = Math.max(0, Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDateHuman(date: string, opts?: { weekday?: boolean }): string {
  if (!isValidDateString(date)) return date;
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: opts?.weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** Yesterday relative to today in tz. */
export function yesterdayInTz(tz?: string, now?: Date): string {
  return addDays(todayInTz(tz, now), -1);
}

export function safeTimezone(tz: unknown): string {
  if (typeof tz !== "string" || !tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
