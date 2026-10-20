import type { Metadata } from "next";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { goals, habitCompletions, habits as habitsTable, sleepSchedules, sleepSessions, tasks } from "@/db/schema";
import { nowMinutesInTz, todayInTz, timeLabel } from "@/lib/dates";
import { greetingFor, planningHint, suggestedCategories } from "@/lib/personalize";
import { complianceStatus, minutesOfDayInTz, sessionDurationMin, type SleepStatus } from "@/lib/sleep";
import { toHabitDTO, toSleepScheduleDTO, toSleepSessionDTO, toTaskDTO } from "@/lib/dto";
import { redirect } from "next/navigation";
import { TodayDashboard } from "@/components/today-dashboard";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const tz = user.timezone;
  const today = todayInTz(tz);
  const nowMin = nowMinutesInTz(tz);

  const [taskRows, habitRows, completionRows, activeSleepRows, lastSleepRows, scheduleRows, goalRows] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.userId, user.id), eq(tasks.date, today))).orderBy(tasks.startTime),
    db.select().from(habitsTable).where(and(eq(habitsTable.userId, user.id), eq(habitsTable.archived, false))),
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, user.id), eq(habitCompletions.date, today))),
    db.select().from(sleepSessions).where(and(eq(sleepSessions.userId, user.id), isNull(sleepSessions.endedAt))).limit(1),
    db
      .select()
      .from(sleepSessions)
      .where(and(eq(sleepSessions.userId, user.id), isNotNull(sleepSessions.endedAt)))
      .orderBy(desc(sleepSessions.endedAt))
      .limit(1),
    db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, user.id)).limit(1),
    db.select().from(goals).where(and(eq(goals.userId, user.id), eq(goals.status, "active"))),
  ]);

  const schedule = scheduleRows[0] ?? null;
  const lastSleep = lastSleepRows[0] ?? null;
  let lastSleepSummary: { durationLabel: string; status: SleepStatus; wakeLabel: string } | null = null;
  if (lastSleep) {
    const dur = sessionDurationMin(lastSleep.startedAt, lastSleep.endedAt);
    const status = complianceStatus({
      durationMin: dur,
      actualWakeMin: lastSleep.endedAt ? minutesOfDayInTz(lastSleep.endedAt, tz) : null,
      targetWakeTime: schedule?.wakeTime ?? null,
      toleranceMin: schedule?.toleranceMin ?? null,
    });
    lastSleepSummary = {
      durationLabel: dur != null ? `${Math.floor(dur / 60)}h ${String(dur % 60).padStart(2, "0")}m` : "—",
      status,
      wakeLabel: lastSleep.endedAt ? timeLabel(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(lastSleep.endedAt)) : "",
    };
  }

  return (
    <TodayDashboard
      today={today}
      timezone={tz}
      nowMin={nowMin}
      greeting={greetingFor(user, nowMin)}
      hint={planningHint(user, taskRows.filter((t) => t.status !== "completed").length)}
      tasks={taskRows.map(toTaskDTO)}
      habits={habitRows.map(toHabitDTO)}
      completedHabitIds={completionRows.map((c) => c.habitId)}
      activeSleep={activeSleepRows[0] ? toSleepSessionDTO(activeSleepRows[0]) : null}
      schedule={schedule ? toSleepScheduleDTO(schedule) : null}
      lastSleepSummary={lastSleepSummary}
      goals={goalRows.map((g) => ({ id: g.id, title: g.title }))}
      suggestedCategories={suggestedCategories(user.interests)}
    />
  );
}
