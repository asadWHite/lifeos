import "server-only";
import { and, asc, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  assistantMessages,
  dailyCheckins,
  goals,
  profiles,
  sleepSessions,
  tasks,
} from "@/db/schema";
import type {
  AssistantMessageRow,
  CheckinRow,
  GoalRow,
  SleepSessionRow,
  TaskRow,
} from "@/db/schema";
import { addDaysIso } from "@/lib/time";

/**
 * Data-access layer. Every query is scoped by profileId — the future RLS
 * boundary maps onto exactly this scope.
 */

export async function listProfiles() {
  return db.select().from(profiles).orderBy(asc(profiles.createdAt));
}

const priorityRank: Record<string, number> = { high: 0, normal: 1, low: 2 };

/** Open tasks (and recently completed), sorted for planning display. */
export async function listTasks(profileId: string): Promise<TaskRow[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.profileId, profileId))
    .orderBy(asc(tasks.createdAt));
  return rows.sort((a, b) => {
    // done items sink to the bottom
    const da = a.status === "done" ? 1 : 0;
    const db2 = b.status === "done" ? 1 : 0;
    if (da !== db2) return da - db2;
    // then due date (nulls last)
    const ad = a.dueDate ?? "9999-12-31";
    const bd = b.dueDate ?? "9999-12-31";
    if (ad !== bd) return ad < bd ? -1 : 1;
    // then priority
    return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
  });
}

export async function listCompletedTasks(profileId: string, limit = 30): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.profileId, profileId), eq(tasks.status, "done")))
    .orderBy(desc(tasks.completedAt))
    .limit(limit);
}

/** Tasks completed (by completedAt local date) within the last n days. */
export async function tasksCompletedSince(
  profileId: string,
  sinceIso: string,
): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.profileId, profileId),
        eq(tasks.status, "done"),
        isNotNull(tasks.completedAt),
        gte(tasks.completedAt, new Date(`${sinceIso}T00:00:00Z`)),
      ),
    )
    .orderBy(asc(tasks.completedAt));
}

export type GoalWithTasks = GoalRow & { tasks: TaskRow[] };

export async function listGoalsWithTasks(profileId: string): Promise<GoalWithTasks[]> {
  const goalRows = await db
    .select()
    .from(goals)
    .where(eq(goals.profileId, profileId))
    .orderBy(asc(goals.createdAt));
  const taskRows = await db.select().from(tasks).where(eq(tasks.profileId, profileId));
  return goalRows.map((g) => ({
    ...g,
    tasks: taskRows.filter((t) => t.goalId === g.id),
  }));
}

export async function getActiveSleepSession(profileId: string): Promise<SleepSessionRow | null> {
  const rows = await db
    .select()
    .from(sleepSessions)
    .where(and(eq(sleepSessions.profileId, profileId), isNotNull(sleepSessions.startedAt)))
    .orderBy(desc(sleepSessions.startedAt))
    .limit(50);
  return rows.find((r) => r.endedAt === null) ?? null;
}

export async function listSleepSessions(profileId: string, limit = 60): Promise<SleepSessionRow[]> {
  return db
    .select()
    .from(sleepSessions)
    .where(
      and(eq(sleepSessions.profileId, profileId), isNotNull(sleepSessions.endedAt)),
    )
    .orderBy(desc(sleepSessions.startedAt))
    .limit(limit);
}

export async function getCheckin(profileId: string, day: string): Promise<CheckinRow | null> {
  const rows = await db
    .select()
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.profileId, profileId), eq(dailyCheckins.day, day)))
    .limit(1);
  return rows[0] ?? null;
}

export async function recentCheckins(profileId: string, days: number, todayIso: string): Promise<CheckinRow[]> {
  return db
    .select()
    .from(dailyCheckins)
    .where(
      and(
        eq(dailyCheckins.profileId, profileId),
        gte(dailyCheckins.day, addDaysIso(todayIso, -(days - 1))),
        lte(dailyCheckins.day, todayIso),
      ),
    )
    .orderBy(asc(dailyCheckins.day));
}

export async function listAssistantMessages(
  profileId: string,
  limit = 50,
): Promise<AssistantMessageRow[]> {
  const rows = await db
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.profileId, profileId))
    .orderBy(desc(assistantMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}
