import type { Metadata } from "next";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { challenges as challengesTable, habitCompletions, habits as habitsTable, sleepSessions, sleepSchedules, tasks } from "@/db/schema";
import { ACHIEVEMENTS, buildStatsSnapshot, evaluateAndAward } from "@/lib/achievements";
import { evaluateChallenge } from "@/lib/challenges";
import { addDays, listDatesBetween, todayInTz } from "@/lib/dates";
import { complianceStatus, minutesOfDayInTz, sessionDurationMin } from "@/lib/sleep";
import { habitConsistency, summarizeToday, weeklySeries } from "@/lib/stats";
import { currentDayStreak, longestDayStreak } from "@/lib/streaks";
import { achievements as achievementsTable } from "@/db/schema";
import { ProgressModule, type AchievementView, type ChallengeView } from "@/components/progress-module";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const tz = user.timezone;
  const today = todayInTz(tz);
  const [y, m] = today.split("-").map(Number);

  const [
    taskRows, habitRows, completionRows, sleepRows, scheduleRows, challengeRows,
  ] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, user.id)).limit(1500),
    db.select().from(habitsTable).where(eq(habitsTable.userId, user.id)),
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, user.id), gte(habitCompletions.date, addDays(today, -28)))),
    db.select().from(sleepSessions).where(and(eq(sleepSessions.userId, user.id), isNotNull(sleepSessions.endedAt))).orderBy(desc(sleepSessions.endedAt)).limit(30),
    db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, user.id)).limit(1),
    db.select().from(challengesTable).where(eq(challengesTable.userId, user.id)).orderBy(desc(challengesTable.startDate)).limit(24),
  ]);

  /* Tasks */
  const todaySummary = summarizeToday(taskRows, today);
  const week = weeklySeries(taskRows, today, 7);
  const completedDates = new Set(
    taskRows.filter((t) => t.status === "completed").map((t) => (t.completedAt ? todayInTz(tz, t.completedAt) : t.date)),
  );
  const taskStreak = currentDayStreak(completedDates, today);
  const taskBest = longestDayStreak(completedDates);

  /* Habits */
  const from28 = addDays(today, -27);
  const habitStats = habitRows.filter((h) => !h.archived).map((h) => {
    const dates = new Set(completionRows.filter((c) => c.habitId === h.id).map((c) => c.date));
    const c = habitConsistency(dates, h.days, from28, today);
    return { id: h.id, name: h.name, ...c };
  });

  /* Sleep */
  const schedule = scheduleRows[0] ?? null;
  const finishedSleep = sleepRows
    .map((s) => ({
      duration: sessionDurationMin(s.startedAt, s.endedAt),
      status: complianceStatus({
        durationMin: sessionDurationMin(s.startedAt, s.endedAt),
        actualWakeMin: s.endedAt ? minutesOfDayInTz(s.endedAt, tz) : null,
        targetWakeTime: schedule?.wakeTime ?? null,
        toleranceMin: schedule?.toleranceMin ?? null,
      }),
    }))
    .filter((s) => s.duration != null);
  const last7Sleep = finishedSleep.slice(0, 7);
  const avgSleep = last7Sleep.length ? Math.round(last7Sleep.reduce((a, s) => a + (s.duration ?? 0), 0) / last7Sleep.length) : null;
  const sleepStatuses = finishedSleep.reduce(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  /* Achievements (idempotent evaluation on read) */
  await evaluateAndAward(user.id, today);
  const [unlockedRows, snapshot] = await Promise.all([
    db.select().from(achievementsTable).where(eq(achievementsTable.userId, user.id)).orderBy(desc(achievementsTable.unlockedAt)),
    buildStatsSnapshot(user.id, today),
  ]);
  const unlockedKeys = new Set(unlockedRows.map((r) => r.key));
  const achievementViews: AchievementView[] = ACHIEVEMENTS.map((a) => ({
    key: a.key,
    title: a.title,
    description: a.description,
    icon: a.icon,
    unlocked: unlockedKeys.has(a.key),
    unlockedAt: unlockedRows.find((r) => r.key === a.key)?.unlockedAt?.toISOString() ?? null,
    progress: snapshot ? a.progress(snapshot) : { current: 0, target: 1 },
  }));

  /* Challenges (lazy deterministic status transitions) */
  const challengeViews: ChallengeView[] = [];
  for (const c of challengeRows) {
    const progress = evaluateChallenge(c, completedDates, today);
    if (progress.state !== c.status) {
      await db
        .update(challengesTable)
        .set({ status: progress.state, completedAt: progress.state === "completed" ? new Date() : null })
        .where(eq(challengesTable.id, c.id));
      c.status = progress.state;
    }
    challengeViews.push({
      id: c.id,
      type: c.type,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      countedDays: progress.countedDays,
      totalDays: progress.totalDays,
      pct: progress.pct,
      missedDays: progress.missedDays.length,
      days: listDatesBetween(c.startDate, c.endDate).map((d) => ({
        date: d,
        state: completedDates.has(d) ? ("counted" as const) : d < today ? ("missed" as const) : d === today ? ("today" as const) : ("future" as const),
      })),
    });
  }

  return (
    <ProgressModule
      today={today}
      currentYear={y}
      currentMonth={m}
      todaySummary={todaySummary}
      week={week}
      taskStreak={taskStreak}
      taskBest={taskBest}
      habitStats={habitStats}
      sleep={{ avg: avgSleep, statuses: sleepStatuses, hasSchedule: !!schedule }}
      achievements={achievementViews}
      challenges={challengeViews}
    />
  );
}
