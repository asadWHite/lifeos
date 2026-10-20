import { addDays, diffDays, isValidDateString, weekdayOf } from "@/lib/dates";

/* Streak rules (documented + unit tested):
 * - Only days the habit is scheduled for can make or break a streak.
 * - Unscheduled days are rest days: they neither extend nor break a streak.
 * - The current streak anchors on today; if today is scheduled but not yet
 *   completed, the streak is measured up to yesterday (today can still be
 *   completed, so it must not break the streak prematurely).
 * - Deterministic: the same stored history always yields the same result. */

export function currentHabitStreak(
  completedDates: ReadonlySet<string>,
  scheduledDays: readonly number[],
  today: string,
  lookbackDays = 400,
): number {
  if (scheduledDays.length === 0 || !isValidDateString(today)) return 0;
  const scheduled = new Set(scheduledDays);
  let cursor = today;
  // Today not yet completed (but scheduled) → measure from yesterday.
  if (scheduled.has(weekdayOf(cursor)) && !completedDates.has(cursor)) {
    cursor = addDays(cursor, -1);
  } else if (!scheduled.has(weekdayOf(cursor))) {
    // Today is a rest day; anchor stays but we scan back to find streak.
  }
  let streak = 0;
  for (let i = 0; i < lookbackDays; i++) {
    if (scheduled.has(weekdayOf(cursor))) {
      if (!completedDates.has(cursor)) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
    if (cursor < "1970-01-02") break;
  }
  return streak;
}

export function longestHabitStreak(
  completedDates: ReadonlySet<string>,
  scheduledDays: readonly number[],
  today: string,
  lookbackDays = 400,
): number {
  if (scheduledDays.length === 0 || completedDates.size === 0) return 0;
  const scheduled = new Set(scheduledDays);
  const sorted = [...completedDates].sort();
  const start = sorted[0];
  const end = today > sorted[sorted.length - 1] ? today : sorted[sorted.length - 1];
  const span = Math.min(diffDays(start, end), lookbackDays);
  let best = 0;
  let run = 0;
  let cursor = start;
  for (let i = 0; i <= span; i++) {
    if (scheduled.has(weekdayOf(cursor))) {
      if (completedDates.has(cursor)) {
        run++;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

/* Task-day streaks: days with at least one completed task. A day only
 * "counts" once tasks were completed on it; today counts if it already has
 * a completion, otherwise we anchor on yesterday. */

export function currentDayStreak(activeDates: ReadonlySet<string>, today: string): number {
  if (!isValidDateString(today)) return 0;
  let cursor = activeDates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (activeDates.has(cursor) && streak < 5000) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestDayStreak(activeDates: ReadonlySet<string>): number {
  if (activeDates.size === 0) return 0;
  const sorted = [...activeDates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (diffDays(sorted[i - 1], sorted[i]) === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}
