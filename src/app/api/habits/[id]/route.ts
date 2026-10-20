import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { habits } from "@/db/schema";
import { handleApiError, jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { habitPatchSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const data = habitPatchSchema.parse(body);
    const patch: Partial<typeof habits.$inferInsert> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.days !== undefined) patch.days = [...new Set(data.days)];
    if (data.archived !== undefined) patch.archived = data.archived;
    const [habit] = await db
      .update(habits)
      .set(patch)
      .where(and(eq(habits.id, id), eq(habits.userId, auth.user.id)))
      .returning();
    if (!habit) return jsonError(404, "Habit not found.");
    return jsonOk({ habit });
  } catch (e) {
    return handleApiError(e, "Could not update the habit. Please try again.");
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const deleted = await db
    .delete(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, auth.user.id)))
    .returning({ id: habits.id });
  if (deleted.length === 0) return jsonError(404, "Habit not found.");
  return jsonOk({ deleted: true });
}
