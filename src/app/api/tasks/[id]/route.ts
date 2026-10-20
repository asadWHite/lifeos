import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals, tasks } from "@/db/schema";
import { evaluateAndAward } from "@/lib/achievements";
import { handleApiError, jsonError, jsonOk, requireUser, userToday } from "@/lib/api-helpers";
import { taskPatchSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const { id } = await ctx.params;
    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .limit(1);
    if (!existing) return jsonError(404, "Task not found.");

    const body = await request.json().catch(() => null);
    const data = taskPatchSchema.parse(body);

    if (data.goalId) {
      const [goal] = await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, data.goalId), eq(goals.userId, user.id)))
        .limit(1);
      if (!goal) return jsonError(400, "The selected goal does not exist.");
    }

    // Revalidate the merged result so partial edits can't create bad intervals.
    const mergedStart = data.startTime !== undefined ? data.startTime : existing.startTime;
    const mergedEnd = data.endTime !== undefined ? data.endTime : existing.endTime;
    if (mergedStart && mergedEnd && mergedEnd <= mergedStart) {
      return jsonError(422, "End time must be after the start time.");
    }

    const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.date !== undefined) patch.date = data.date;
    if (data.startTime !== undefined) patch.startTime = data.startTime;
    if (data.endTime !== undefined) patch.endTime = data.endTime;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.category !== undefined) patch.category = data.category;
    if (data.goalId !== undefined) patch.goalId = data.goalId;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.completedAt = data.status === "completed" ? new Date() : null;
    }

    const [task] = await db
      .update(tasks)
      .set(patch)
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning();

    let newAchievements: Awaited<ReturnType<typeof evaluateAndAward>> = [];
    if (data.status === "completed" && existing.status !== "completed") {
      newAchievements = await evaluateAndAward(user.id, userToday(user));
    }
    return jsonOk({ task, newAchievements });
  } catch (e) {
    return handleApiError(e, "Could not update the task. Please try again.");
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const { id } = await ctx.params;
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning({ id: tasks.id });
  if (deleted.length === 0) return jsonError(404, "Task not found.");
  return jsonOk({ deleted: true });
}
