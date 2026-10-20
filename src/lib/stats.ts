import { addDays, listDatesBetween, weekdayOf } from "@/lib/dates";

/* Statistics: every number derives from stored records with explicit
 * denominators. Deleted tasks disappear from counts; reopened tasks return
 * to "pending"; edited tasks are counted once (they are single rows). */

export interface TaskLike {
  date: string;
  status: string;
}

export interface DaySummary {
  date: string;
  total: number;
  done: number;
}

/** Tasks scheduled on `today`: completion ratio. Denominator excludes nothing. */
export function summarizeToday(tasks: TaskLike[], today: string) {
  const todays = tasks.filter((t) => t.date === today);
  const done = todays.filter((t) => t.status === "completed").length;
  const total = todays.length;
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Pending tasks whose date has passed = overdue. */
export function overdueTasks(tasks: TaskLike[], today: string): TaskLike[] {
  return tasks.filter((t) => t.status !== "completed" && t.date < today);
}

/** Last n days (inclusive of today) of scheduled/completed task totals. */
export function weeklySeries(tasks: TaskLike[], today: string, days = 7): DaySummary[] {
  const start = addDays(today, -(days - 1));
  return listDatesBetween(start, today).map((date) => {
    const dayTasks = tasks.filter((t) => t.date === date);
    return {
      date,
      total: dayTasks.length,
      done: dayTasks.filter((t) => t.status === "completed").length,
    };
  });
}

/** % of scheduled occurrences completed between two dates (inclusive). */
export function habitConsistency(
  completedDates: ReadonlySet<string>,
  scheduledDays: readonly number[],
  from: string,
  to: string,
): { scheduled: number; completed: number; pct: number } {
  const days = listDatesBetween(from, to);
  const scheduled = new Set(scheduledDays);
  let occurrences = 0;
  let completed = 0;
  for (const d of days) {
    if (scheduled.has(weekdayOf(d))) {
      occurrences++;
      if (completedDates.has(d)) completed++;
    }
  }
  return {
    scheduled: occurrences,
    completed,
    pct: occurrences === 0 ? 0 : Math.round((completed / occurrences) * 100),
  };
}

/* ---- TimeFlow ordering: chronological by start time; anytime last ---- */

export interface TimelineItemLike {
  startTime: string | null;
}

export function sortForTimeline<T extends TimelineItemLike>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const at = a.startTime ?? "99:99";
    const bt = b.startTime ?? "99:99";
    return at.localeCompare(bt);
  });
}

/** The "current" activity: started, not ended yet (or start passed within grace). */
export function pickCurrentActivity<T extends TimelineItemLike & { endTime: string | null; status: string }>(
  items: T[],
  nowMin: number,
): T | null {
  const toMin = (t: string | null) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let current: T | null = null;
  for (const item of items) {
    if (item.status === "completed") continue;
    const s = toMin(item.startTime);
    if (s == null) continue;
    const e = toMin(item.endTime);
    if (e != null && nowMin >= s && nowMin < e) return item; // inside interval
    if (e == null && s <= nowMin) current = item; // latest started open activity
  }
  return current;
}

/** Next pending activity that hasn't started yet. */
export function pickNextActivity<T extends TimelineItemLike & { status: string }>(items: T[], nowMin: number): T | null {
  const sorted = sortForTimeline(items.filter((i) => i.status !== "completed" && i.startTime));
  for (const item of sorted) {
    const [h, m] = item.startTime!.split(":").map(Number);
    if (h * 60 + m > nowMin) return item;
  }
  return null;
}

/** Overdue within today: pending with end time already passed (or start-only passed). */
export function isOverdueWithinDay(item: { startTime: string | null; endTime: string | null; status: string }, nowMin: number): boolean {
  if (item.status === "completed") return false;
  const toMin = (t: string | null) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);
  const end = toMin(item.endTime);
  const start = toMin(item.startTime);
  if (end != null) return nowMin > end;
  if (start != null) return nowMin > start + 120;
  return false;
}

/* ---- Achievement snapshot ---- */

export interface StatsSnapshot {
  tasksCompleted: number;
  currentTaskStreak: number;
  longestTaskStreak: number;
  habitCompletions: number;
  bestHabitStreak: number;
  sleepSessions: number;
  greenSleepSessions: number;
  goalsCompleted: number;
  challengesCompleted: string[]; // challenge types completed
}
