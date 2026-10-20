import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { evaluateAndAward } from "@/lib/achievements";
import { handleApiError, jsonError, jsonOk, requireUser, userToday } from "@/lib/api-helpers";
import { goalPatchSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const { id } = await ctx.params;
    const [existing] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, user.id)))
      .limit(1);
    if (!existing) return jsonError(404, "Goal not found.");

    const body = await request.json().catch(() => null);
    const data = goalPatchSchema.parse(body);

    const patch: Partial<typeof goals.$inferInsert> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.category !== undefined) patch.category = data.category;
    if (data.targetDate !== undefined) patch.targetDate = data.targetDate;
    if (data.targetValue !== undefined) patch.targetValue = data.targetValue;
    if (data.unit !== undefined) patch.unit = data.unit;
    if (data.currentValue !== undefined) {
      const cap = data.targetValue !== undefined ? data.targetValue : existing.targetValue;
      patch.currentValue = cap != null ? Math.min(data.currentValue, cap) : data.currentValue;
    }

    // Completion rules: measurable goals complete when the target is reached;
    // non-measurable goals complete only by explicit user action. A target
    // date arriving never completes a goal on its own.
    const finalValue = patch.currentValue ?? existing.currentValue;
    const finalTarget = patch.targetValue !== undefined ? patch.targetValue : existing.targetValue;
    if (data.action === "reopen") {
      patch.status = "active";
      patch.completedAt = null;
    } else if (data.action === "complete") {
      patch.status = "completed";
      patch.completedAt = new Date();
    } else if (finalTarget != null && finalValue >= finalTarget && existing.status !== "completed") {
      patch.status = "completed";
      patch.completedAt = new Date();
    }

    const [goal] = await db
      .update(goals)
      .set(patch)
      .where(and(eq(goals.id, id), eq(goals.userId, user.id)))
      .returning();

    let newAchievements: Awaited<ReturnType<typeof evaluateAndAward>> = [];
    if (goal.status === "completed" && existing.status !== "completed") {
      newAchievements = await evaluateAndAward(user.id, userToday(user));
    }
    return jsonOk({ goal, newAchievements });
  } catch (e) {
    return handleApiError(e, "Could not update the goal. Please try again.");
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const deleted = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, auth.user.id)))
    .returning({ id: goals.id });
  if (deleted.length === 0) return jsonError(404, "Goal not found.");
  return jsonOk({ deleted: true });
}
