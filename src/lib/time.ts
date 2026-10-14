/**
 * Timezone-aware date helpers.
 *
 * "Today" is always computed in the *profile's* timezone, so date boundaries
 * (tasks due today, sleep nights, check-ins) stay correct for the user even
 * when the server runs in UTC.
 */

const FALLBACK_TZ = "UTC";

function safeTz(tz: string | null | undefined): string {
  if (tz && tz.length > 0) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    } catch {
      return FALLBACK_TZ;
    }
  }
  return FALLBACK_TZ;
}

export type DayParts = {
  iso: string; // YYYY-MM-DD
  hour: number; // 0-23 local
  minute: number;
  weekday: number; // 0 = Sunday
};

export function dayPartsInTz(
  tz: string | null | undefined,
  date: Date = new Date(),
): DayParts {
  const timeZone = safeTz(tz);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute: Number(parts.minute),
    weekday: weekdayOfIso(`${parts.year}-${parts.month}-${parts.day}`),
  };
}

export function todayInTz(tz: string | null | undefined, date?: Date): string {
  return dayPartsInTz(tz, date).iso;
}

function weekdayOfIso(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.getUTCDay();
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** "7h 32m", "45m", or "—" */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes) || minutes < 0) return "—";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "22:45" in the profile timezone. */
export function formatClock(
  date: Date | string | null | undefined,
  tz: string,
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = dayPartsInTz(tz, d);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

/** "Mon 5 Jan" for an ISO date. */
export function formatDateLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Compact weekday label for charts: "Mon". */
export function formatDayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

/** Friendly relative label used on task rows. */
export function friendlyDue(iso: string | null, todayIso: string): string | null {
  if (!iso) return null;
  if (iso === todayIso) return "Today";
  if (iso === addDaysIso(todayIso, 1)) return "Tomorrow";
  if (iso === addDaysIso(todayIso, -1)) return "Yesterday";
  const diff = Math.round(
    (new Date(`${iso}T00:00:00Z`).getTime() -
      new Date(`${todayIso}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  if (diff < 0) return `${-diff} day${-diff === 1 ? "" : "s"} overdue`;
  if (diff <= 6) return formatDayShort(iso);
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export type Greeting = { part: "morning" | "afternoon" | "evening"; label: string };

export function greetingInTz(tz: string, date: Date = new Date()): Greeting {
  const { hour } = dayPartsInTz(tz, date);
  if (hour < 5) return { part: "evening", label: "Good night" };
  if (hour < 12) return { part: "morning", label: "Good morning" };
  if (hour < 18) return { part: "afternoon", label: "Good afternoon" };
  return { part: "evening", label: "Good evening" };
}

/** Ordered list of the last `n` ISO dates ending today (oldest first). */
export function lastNDays(tz: string, n: number, date: Date = new Date()): string[] {
  const today = todayInTz(tz, date);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDaysIso(today, -i));
  return out;
}

/** Minutes elapsed between two instants. */
export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}
