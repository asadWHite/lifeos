"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals, tasks } from "@/db/schema";
import { requireSession } from "@/server/session";
import { assistantProposalSchema, createTaskSchema, goalSchema, updateTaskSchema } from "@/lib/validation";
import { addDaysIso, todayInTz } from "@/lib/time";
import { listGoalsWithTasks } from "@/server/data";
import * as demo from "@/server/demo";

const D = demo.isDemoMode;
export type ActionResult = { ok: true } | { ok: false; error: string };
function refresh() { revalidatePath("/", "layout"); }

export async function createTaskAction(raw: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const input = createTaskSchema.parse(raw);
    if (D()) {
      demo.demoCreateTask(session.profile.id, { title: input.title, notes: input.notes??null, dueDate: input.dueDate??null, priority: input.priority, durationMinutes: input.durationMinutes??null, goalId: input.goalId??null });
      refresh(); return { ok: true };
    }
    if (input.goalId) {
      const owned = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.id, input.goalId), eq(goals.profileId, session.profile.id))).limit(1);
      if (owned.length === 0) return { ok: false, error: "Goal not found." };
    }
    await db.insert(tasks).values({ profileId: session.profile.id, title: input.title, notes: input.notes??null, dueDate: input.dueDate??null, priority: input.priority, durationMinutes: input.durationMinutes??null, goalId: input.goalId??null });
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not create the task." }; }
}

export async function updateTaskAction(raw: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const input = updateTaskSchema.parse(raw);
    if (D()) {
      demo.demoUpdateTask(input.id, session.profile.id, { title: input.title, notes: input.notes??undefined, dueDate: input.dueDate, priority: input.priority } as Partial<typeof tasks.$inferInsert>);
      refresh(); return { ok: true };
    }
    const patch: Partial<typeof tasks.$inferInsert> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.notes !== undefined) patch.notes = input.notes ?? null;
    if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.durationMinutes !== undefined) patch.durationMinutes = input.durationMinutes ?? null;
    if (input.goalId !== undefined) patch.goalId = input.goalId ?? null;
    await db.update(tasks).set(patch).where(and(eq(tasks.id, input.id), eq(tasks.profileId, session.profile.id)));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not update the task." }; }
}

export async function toggleTaskAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (D()) { demo.demoToggleTask(id, session.profile.id); refresh(); return { ok: true }; }
    const rows = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.profileId, session.profile.id))).limit(1);
    const task = rows[0];
    if (!task) return { ok: false, error: "Task not found." };
    const done = task.status !== "done";
    await db.update(tasks).set({ status: done ? "done" : "todo", completedAt: done ? new Date() : null }).where(eq(tasks.id, id));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not update the task." }; }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (D()) { demo.demoDeleteTask(id, session.profile.id); refresh(); return { ok: true }; }
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.profileId, session.profile.id)));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not delete the task." }; }
}

export async function createGoalAction(raw: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const input = goalSchema.parse(raw);
    if (D()) {
      demo.demoCreateGoal(session.profile.id, { title: input.title, description: input.description??null, category: input.category, targetDate: input.targetDate??null, metricTarget: input.metricTarget??null, metricUnit: input.metricUnit??null });
      refresh(); return { ok: true };
    }
    await db.insert(goals).values({ profileId: session.profile.id, title: input.title, description: input.description??null, category: input.category, targetDate: input.targetDate??null, metricTarget: input.metricTarget??null, metricUnit: input.metricUnit??null });
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not create the goal." }; }
}

export async function updateGoalAction(id: string, raw: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const input = goalSchema.parse(raw);
    if (D()) { demo.demoUpdateGoal(id, session.profile.id, { title: input.title, description: input.description??null, category: input.category, targetDate: input.targetDate??null, metricTarget: input.metricTarget??null, metricUnit: input.metricUnit??null }); refresh(); return { ok: true }; }
    await db.update(goals).set({ title: input.title, description: input.description??null, category: input.category, targetDate: input.targetDate??null, metricTarget: input.metricTarget??null, metricUnit: input.metricUnit??null }).where(and(eq(goals.id, id), eq(goals.profileId, session.profile.id)));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not update the goal." }; }
}

export async function setGoalStatusAction(id: string, status: "active"|"archived"|"completed"): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (D()) { demo.demoUpdateGoal(id, session.profile.id, { status }); refresh(); return { ok: true }; }
    await db.update(goals).set({ status }).where(and(eq(goals.id, id), eq(goals.profileId, session.profile.id)));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not update the goal." }; }
}

export async function logGoalProgressAction(id: string, amount: number): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1000) return { ok: false, error: "Invalid amount." };
    const owned = await listGoalsWithTasks(session.profile.id);
    const goal = owned.find((g) => g.id === id);
    if (!goal) return { ok: false, error: "Goal not found." };
    const next = Math.max(0, goal.metricProgress + amount);
    if (goal.metricTarget != null && next > goal.metricTarget) return { ok: false, error: "That would exceed the target." };
    if (D()) {
      demo.demoUpdateGoal(id, session.profile.id, { metricProgress: next, ...(goal.metricTarget != null && next >= goal.metricTarget ? { status: "completed" } : {}) });
      refresh(); return { ok: true };
    }
    await db.update(goals).set({ metricProgress: next }).where(eq(goals.id, id));
    if (goal.metricTarget != null && next >= goal.metricTarget) await db.update(goals).set({ status: "completed" }).where(eq(goals.id, id));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not log progress." }; }
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (D()) { demo.demoDeleteGoal(id, session.profile.id); refresh(); return { ok: true }; }
    await db.delete(goals).where(and(eq(goals.id, id), eq(goals.profileId, session.profile.id)));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not delete the goal." }; }
}

export async function applyTaskProposalAction(raw: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const proposal = assistantProposalSchema.parse(raw);
    const tz = session.profile.timezone;
    const due = proposal.due === "today" ? todayInTz(tz) : addDaysIso(todayInTz(tz), 1);
    if (D()) {
      demo.demoCreateTask(session.profile.id, { title: proposal.title, dueDate: due, priority: proposal.priority, durationMinutes: proposal.durationMinutes??null, source: "assistant" });
      refresh(); return { ok: true };
    }
    await db.insert(tasks).values({ profileId: session.profile.id, title: proposal.title, dueDate: due, priority: proposal.priority, durationMinutes: proposal.durationMinutes??null, source: "assistant" });
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not add the task." }; }
}
