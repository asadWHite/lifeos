import type { StatsSnapshot } from "@/lib/stats";

/* Achievement catalog: each award has an explicit, verifiable requirement
 * evaluated against a snapshot of real stored data. Awards are persisted
 * idempotently (unique userId+key) so one-time achievements cannot repeat. */

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string; // lucide icon name resolved in the UI layer
  earned: (s: StatsSnapshot) => boolean;
  progress: (s: StatsSnapshot) => { current: number; target: number };
}

const def = (
  key: string,
  title: string,
  description: string,
  icon: string,
  target: number,
  pick: (s: StatsSnapshot) => number,
): AchievementDef => ({
  key,
  title,
  description,
  icon,
  earned: (s) => pick(s) >= target,
  progress: (s) => ({ current: Math.min(pick(s), target), target }),
});

export const ACHIEVEMENTS: AchievementDef[] = [
  def("first_task", "First Step", "Complete your first task.", "check-circle-2", 1, (s) => s.tasksCompleted),
  def("ten_tasks", "Momentum", "Complete 10 tasks.", "zap", 10, (s) => s.tasksCompleted),
  def("fifty_tasks", "Half Century", "Complete 50 tasks.", "trophy", 50, (s) => s.tasksCompleted),
  def("streak_3", "Three Days Running", "Complete tasks on 3 consecutive days.", "flame", 3, (s) =>
    Math.max(s.currentTaskStreak, s.longestTaskStreak)),
  def("streak_7", "One Strong Week", "Complete tasks on 7 consecutive days.", "calendar-check", 7, (s) =>
    Math.max(s.currentTaskStreak, s.longestTaskStreak)),
  def("first_habit", "Habit Formed", "Record your first habit completion.", "sprout", 1, (s) => s.habitCompletions),
  def("habit_streak_7", "Weekly Rhythm", "Hold a 7-day streak on any habit.", "repeat", 7, (s) => s.bestHabitStreak),
  def("first_sleep", "Lights Out", "Record your first sleep session.", "moon", 1, (s) => s.sleepSessions),
  def("green_3", "In Tune", "Wake on schedule (green) 3 times.", "sunrise", 3, (s) => s.greenSleepSessions),
  def("goal_complete", "Goal Getter", "Complete a personal goal.", "target", 1, (s) => s.goalsCompleted),
  def("challenge_10", "Ten-Day Challenge", "Finish a 10-day challenge.", "flag", 1, (s) =>
    s.challengesCompleted.filter((t) => t === "ten_day").length),
  def("challenge_month", "Monthly Master", "Finish a monthly challenge.", "medal", 1, (s) =>
    s.challengesCompleted.filter((t) => t === "monthly").length),
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

export function earnedKeys(snapshot: StatsSnapshot): string[] {
  return ACHIEVEMENTS.filter((a) => a.earned(snapshot)).map((a) => a.key);
}

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
