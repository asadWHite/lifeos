import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { goals, tasks } from "@/db/schema";
import { evaluateAndAward } from "@/lib/achievements";
import { handleApiError, jsonError, jsonOk, requireUser, userToday } from "@/lib/api-helpers";
import { isValidDateString } from "@/lib/dates";
import { taskCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conds = [eq(tasks.userId, user.id)];
  if (date && isValidDateString(date)) conds.push(eq(tasks.date, date));
  if (from && isValidDateString(from)) conds.push(gte(tasks.date, from));
  if (to && isValidDateString(to)) conds.push(lte(tasks.date, to));

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conds))
    .orderBy(asc(tasks.date), asc(tasks.startTime), asc(tasks.createdAt))
    .limit(1000);
  return jsonOk({ tasks: rows });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const body = await request.json().catch(() => null);
    const data = taskCreateSchema.parse(body);
    if (data.goalId) {
      const [goal] = await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, data.goalId), eq(goals.userId, user.id)))
        .limit(1);
      if (!goal) return jsonError(400, "The selected goal does not exist.");
    }
    const [task] = await db
      .insert(tasks)
      .values({
        userId: user.id,
        title: data.title,
        description: data.description ?? "",
        date: data.date,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        priority: data.priority,
        category: data.category,
        goalId: data.goalId ?? null,
      })
      .returning();
    return jsonOk({ task, newAchievements: [] as unknown[] }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "Could not save the task. Please try again.");
  }
}
