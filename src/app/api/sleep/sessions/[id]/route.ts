import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sleepSessions } from "@/db/schema";
import { evaluateAndAward } from "@/lib/achievements";
import { handleApiError, jsonError, jsonOk, requireUser, userToday } from "@/lib/api-helpers";
import { todayInTz } from "@/lib/dates";
import { sleepSessionPatchSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const { id } = await ctx.params;
    const [existing] = await db
      .select()
      .from(sleepSessions)
      .where(and(eq(sleepSessions.id, id), eq(sleepSessions.userId, user.id)))
      .limit(1);
    if (!existing) return jsonError(404, "Sleep session not found.");

    const body = await request.json().catch(() => null);
    const data = sleepSessionPatchSchema.parse(body);

    const patch: Partial<typeof sleepSessions.$inferInsert> = {};
    if (data.startedAt !== undefined) patch.startedAt = new Date(data.startedAt);
    if (data.note !== undefined) patch.note = data.note;
    if (data.endNow) {
      if (existing.endedAt) return jsonError(400, "This session has already ended.");
      patch.endedAt = new Date();
    } else if (data.endedAt !== undefined) {
      patch.endedAt = data.endedAt ? new Date(data.endedAt) : null;
    }

    const finalStart = patch.startedAt ?? existing.startedAt;
    const finalEnd = patch.endedAt !== undefined ? patch.endedAt : existing.endedAt;
    if (finalEnd && finalEnd <= finalStart) {
      return jsonError(422, "Wake time must be after the start of sleep.");
    }
    if (finalEnd) {
      // The wake-up local date determines which day the sleep "belongs" to.
      patch.date = todayInTz(user.timezone, finalEnd);
    }

    const [session] = await db
      .update(sleepSessions)
      .set(patch)
      .where(and(eq(sleepSessions.id, id), eq(sleepSessions.userId, user.id)))
      .returning();

    let newAchievements: Awaited<ReturnType<typeof evaluateAndAward>> = [];
    if (finalEnd && !existing.endedAt) {
      newAchievements = await evaluateAndAward(user.id, userToday(user));
    }
    return jsonOk({ session, newAchievements });
  } catch (e) {
    return handleApiError(e, "Could not update the sleep session. Please try again.");
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const deleted = await db
    .delete(sleepSessions)
    .where(and(eq(sleepSessions.id, id), eq(sleepSessions.userId, auth.user.id)))
    .returning({ id: sleepSessions.id });
  if (deleted.length === 0) return jsonError(404, "Sleep session not found.");
  return jsonOk({ deleted: true });
}
