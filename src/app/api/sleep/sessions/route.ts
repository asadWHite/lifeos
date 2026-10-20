import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { sleepSessions } from "@/db/schema";
import { handleApiError, jsonError, jsonOk, requireUser, userToday } from "@/lib/api-helpers";
import { todayInTz } from "@/lib/dates";
import { sleepLogSchema } from "@/lib/validation";
import { evaluateAndAward } from "@/lib/achievements";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 60) || 60, 200);
  const rows = await db
    .select()
    .from(sleepSessions)
    .where(eq(sleepSessions.userId, auth.user.id))
    .orderBy(desc(sleepSessions.startedAt))
    .limit(limit);
  return jsonOk({ sessions: rows });
}

/* Starts a new sleep session. Rejects with 409 if one is already active —
 * an active session survives reloads instead of duplicating. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => null);

    // Manual historical log (optional startedAt/endedAt in the payload).
    if (body && typeof body.startedAt === "string") {
      const data = sleepLogSchema.parse(body);
      const startedAt = new Date(data.startedAt);
      const endedAt = data.endedAt ? new Date(data.endedAt) : null;
      if (!endedAt) {
        const [active] = await db
          .select({ id: sleepSessions.id })
          .from(sleepSessions)
          .where(and(eq(sleepSessions.userId, auth.user.id), isNull(sleepSessions.endedAt)))
          .limit(1);
        if (active) return jsonError(409, "A sleep session is already in progress.");
      }
      const [session] = await db
        .insert(sleepSessions)
        .values({
          userId: auth.user.id,
          startedAt,
          endedAt,
          date: endedAt ? todayInTz(auth.user.timezone, endedAt) : todayInTz(auth.user.timezone, startedAt),
          note: data.note ?? "",
        })
        .returning();
      if (endedAt) await evaluateAndAward(auth.user.id, userToday(auth.user));
      return jsonOk({ session }, { status: 201 });
    }

    const [active] = await db
      .select({ id: sleepSessions.id })
      .from(sleepSessions)
      .where(and(eq(sleepSessions.userId, auth.user.id), isNull(sleepSessions.endedAt)))
      .limit(1);
    if (active) return jsonError(409, "A sleep session is already in progress.");

    const note = typeof body?.note === "string" ? body.note.slice(0, 500) : "";
    const now = new Date();
    const [session] = await db
      .insert(sleepSessions)
      .values({ userId: auth.user.id, startedAt: now, date: userToday(auth.user), note })
      .returning();
    return jsonOk({ session }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "Could not start the sleep session. Please try again.");
  }
}
