import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { habitCompletions, habits } from "@/db/schema";
import { evaluateAndAward } from "@/lib/achievements";
import { handleApiError, jsonError, jsonOk, requireUser, userToday } from "@/lib/api-helpers";
import { habitCompleteSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/* Toggle a scheduled habit occurrence. Idempotent: unique(habitId, date)
 * means repeated "done" writes never duplicate a completion record. */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const { id } = await ctx.params;
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, user.id)))
      .limit(1);
    if (!habit) return jsonError(404, "Habit not found.");

    const body = await request.json().catch(() => null);
    const data = habitCompleteSchema.parse(body);
    const today = userToday(user);
    if (data.date > today) return jsonError(400, "You cannot complete a future occurrence.");

    if (data.done) {
      await db
        .insert(habitCompletions)
        .values({ habitId: id, userId: user.id, date: data.date })
        .onConflictDoNothing();
    } else {
      await db
        .delete(habitCompletions)
        .where(and(eq(habitCompletions.habitId, id), eq(habitCompletions.userId, user.id), eq(habitCompletions.date, data.date)));
    }

    const newAchievements = await evaluateAndAward(user.id, today);
    return jsonOk({ date: data.date, done: data.done, newAchievements });
  } catch (e) {
    return handleApiError(e, "Could not record the habit. Please try again.");
  }
}
