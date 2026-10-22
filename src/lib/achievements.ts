/* Re-export catalog from the client-safe module so existing server code
 * keeps working without changing its imports. */
export { ACHIEVEMENTS, ACHIEVEMENT_MAP, earnedKeys } from "@/lib/achievement-catalog";
export type { AchievementDef } from "@/lib/achievement-catalog";
import { ACHIEVEMENT_MAP, earnedKeys } from "@/lib/achievement-catalog";
import type { StatsSnapshot } from "@/lib/stats";

export interface UnlockedAchievement {
  key: string;
  title: string;
  description: string;
}

function todayDateOf(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/* Builds the achievement snapshot from real stored records (lazy imports
 * keep the pure rules importable in unit tests without a database). */
export async function buildStatsSnapshot(userId: string, today: string): Promise<StatsSnapshot | null> {
  const [{ db }, schema, { eq, and, isNotNull, sql }, { currentDayStreak, longestDayStreak, longestHabitStreak }, { complianceStatus, minutesOfDayInTz }, { safeTimezone }] =
    await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
      import("@/lib/streaks"),
      import("@/lib/sleep"),
      import("@/lib/dates"),
    ]);

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) return null;
  const tz = safeTimezone(user.timezone);

  const completedTasks = await db
    .select({ date: schema.tasks.date, completedAt: schema.tasks.completedAt })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.userId, userId), eq(schema.tasks.status, "completed")));

  const taskDates = new Set(
    completedTasks.map((t) => (t.completedAt ? todayDateOf(t.completedAt, tz) : t.date)),
  );

  const habitRows = await db.select().from(schema.habits).where(eq(schema.habits.userId, userId));
  const habitComp = await db
    .select({ habitId: schema.habitCompletions.habitId, date: schema.habitCompletions.date })
    .from(schema.habitCompletions)
    .where(eq(schema.habitCompletions.userId, userId));

  let bestHabitStreak = 0;
  for (const h of habitRows) {
    const dates = new Set(habitComp.filter((c) => c.habitId === h.id).map((c) => c.date));
    if (dates.size > 0) bestHabitStreak = Math.max(bestHabitStreak, longestHabitStreak(dates, h.days, today));
  }

  const [schedule] = await db
    .select()
    .from(schema.sleepSchedules)
    .where(eq(schema.sleepSchedules.userId, userId))
    .limit(1);
  const sleepRows = await db
    .select()
    .from(schema.sleepSessions)
    .where(and(eq(schema.sleepSessions.userId, userId), isNotNull(schema.sleepSessions.endedAt)));

  let green = 0;
  for (const s of sleepRows) {
    if (!s.endedAt) continue;
    const dur = Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000);
    const status = complianceStatus({
      durationMin: dur,
      actualWakeMin: minutesOfDayInTz(s.endedAt, tz),
      targetWakeTime: schedule?.wakeTime ?? null,
      toleranceMin: schedule?.toleranceMin ?? null,
    });
    if (status === "green") green++;
  }

  const goalsDone = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.goals)
    .where(and(eq(schema.goals.userId, userId), eq(schema.goals.status, "completed")));

  const challengesDone = await db
    .select({ type: schema.challenges.type })
    .from(schema.challenges)
    .where(and(eq(schema.challenges.userId, userId), eq(schema.challenges.status, "completed")));

  return {
    tasksCompleted: completedTasks.length,
    currentTaskStreak: currentDayStreak(taskDates, today),
    longestTaskStreak: longestDayStreak(taskDates),
    habitCompletions: habitComp.length,
    bestHabitStreak,
    sleepSessions: sleepRows.length,
    greenSleepSessions: green,
    goalsCompleted: goalsDone[0]?.n ?? 0,
    challengesCompleted: challengesDone.map((c) => c.type),
  };
}

export async function evaluateAndAward(userId: string, today: string): Promise<UnlockedAchievement[]> {
  const [{ db }, schema, { eq }] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  const snapshot = await buildStatsSnapshot(userId, today);
  if (!snapshot) return [];

  const already = await db
    .select({ key: schema.achievements.key })
    .from(schema.achievements)
    .where(eq(schema.achievements.userId, userId));
  const have = new Set(already.map((a) => a.key));

  const fresh: UnlockedAchievement[] = [];
  for (const key of earnedKeys(snapshot)) {
    if (have.has(key)) continue;
    const inserted = await db
      .insert(schema.achievements)
      .values({ userId, key })
      .onConflictDoNothing()
      .returning({ key: schema.achievements.key });
    if (inserted.length > 0) {
      const meta = ACHIEVEMENT_MAP.get(key)!;
      fresh.push({ key, title: meta.title, description: meta.description });
    }
  }
  return fresh;
}
