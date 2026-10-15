import "server-only";
import { and, asc, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  assistantMessages, dailyCheckins, goals, profiles, sleepSessions, tasks,
} from "@/db/schema";
import type {
  AssistantMessageRow, CheckinRow, GoalRow, SleepSessionRow, TaskRow,
} from "@/db/schema";
import { addDaysIso } from "@/lib/time";
import * as demo from "@/server/demo";

const D = demo.isDemoMode;

export async function listProfiles() {
  if (D()) return demo.demoListProfiles();
  return db.select().from(profiles).orderBy(asc(profiles.createdAt));
}

const priorityRank: Record<string, number> = { high: 0, normal: 1, low: 2 };

export async function listTasks(profileId: string): Promise<TaskRow[]> {
  if (D()) return demo.demoListTasks(profileId);
  const rows = await db.select().from(tasks).where(eq(tasks.profileId, profileId)).orderBy(asc(tasks.createdAt));
  return rows.sort((a, b) => {
    const da = a.status === "done" ? 1 : 0, db2 = b.status === "done" ? 1 : 0;
    if (da !== db2) return da - db2;
    const ad = a.dueDate ?? "9999-12-31", bd = b.dueDate ?? "9999-12-31";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
  });
}

export async function listCompletedTasks(profileId: string, limit = 30): Promise<TaskRow[]> {
  if (D()) return demo.demoListTasks(profileId).filter(t=>t.status==="done").slice(0,limit);
  return db.select().from(tasks).where(and(eq(tasks.profileId, profileId), eq(tasks.status, "done"))).orderBy(desc(tasks.completedAt)).limit(limit);
}

export async function tasksCompletedSince(profileId: string, sinceIso: string): Promise<TaskRow[]> {
  if (D()) return demo.demoTasksCompletedSince(profileId, sinceIso);
  return db.select().from(tasks).where(and(eq(tasks.profileId, profileId), eq(tasks.status, "done"), isNotNull(tasks.completedAt), gte(tasks.completedAt, new Date(`${sinceIso}T00:00:00Z`)))).orderBy(asc(tasks.completedAt));
}

export type GoalWithTasks = GoalRow & { tasks: TaskRow[] };

export async function listGoalsWithTasks(profileId: string): Promise<GoalWithTasks[]> {
  if (D()) return demo.demoGoalsWithTasks(profileId);
  const goalRows = await db.select().from(goals).where(eq(goals.profileId, profileId)).orderBy(asc(goals.createdAt));
  const taskRows = await db.select().from(tasks).where(eq(tasks.profileId, profileId));
  return goalRows.map((g) => ({ ...g, tasks: taskRows.filter((t) => t.goalId === g.id) }));
}

export async function getActiveSleepSession(profileId: string): Promise<SleepSessionRow | null> {
  if (D()) return demo.demoGetActiveSleep(profileId);
  const rows = await db.select().from(sleepSessions).where(and(eq(sleepSessions.profileId, profileId), isNotNull(sleepSessions.startedAt))).orderBy(desc(sleepSessions.startedAt)).limit(50);
  return rows.find((r) => r.endedAt === null) ?? null;
}

export async function listSleepSessions(profileId: string, limit = 60): Promise<SleepSessionRow[]> {
  if (D()) return demo.demoListSleep(profileId, limit);
  return db.select().from(sleepSessions).where(and(eq(sleepSessions.profileId, profileId), isNotNull(sleepSessions.endedAt))).orderBy(desc(sleepSessions.startedAt)).limit(limit);
}

export async function getCheckin(profileId: string, day: string): Promise<CheckinRow | null> {
  if (D()) return demo.demoGetCheckin(profileId, day);
  const rows = await db.select().from(dailyCheckins).where(and(eq(dailyCheckins.profileId, profileId), eq(dailyCheckins.day, day))).limit(1);
  return rows[0] ?? null;
}

export async function recentCheckins(profileId: string, days: number, todayIso: string): Promise<CheckinRow[]> {
  if (D()) return demo.demoRecentCheckins(profileId, days, todayIso);
  return db.select().from(dailyCheckins).where(and(eq(dailyCheckins.profileId, profileId), gte(dailyCheckins.day, addDaysIso(todayIso, -(days - 1))), lte(dailyCheckins.day, todayIso))).orderBy(asc(dailyCheckins.day));
}

export async function listAssistantMessages(profileId: string, limit = 50): Promise<AssistantMessageRow[]> {
  if (D()) return demo.demoListMessages(profileId, limit);
  const rows = await db.select().from(assistantMessages).where(eq(assistantMessages.profileId, profileId)).orderBy(desc(assistantMessages.createdAt)).limit(limit);
  return rows.reverse();
}
