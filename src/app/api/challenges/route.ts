import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges, tasks } from "@/db/schema";
import { challengeWindow, evaluateChallenge } from "@/lib/challenges";
import { evaluateAndAward } from "@/lib/achievements";
import { handleApiError, jsonError, jsonOk, requireUser, userToday } from "@/lib/api-helpers";
import { todayInTz } from "@/lib/dates";
import { challengeCreateSchema } from "@/lib/validation";

async function countedDatesFor(userId: string, tz: string): Promise<Set<string>> {
  const rows = await db
    .select({ completedAt: tasks.completedAt })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "completed")));
  const set = new Set<string>();
  for (const r of rows) if (r.completedAt) set.add(todayInTz(tz, r.completedAt));
  return set;
}

/* Lists challenges with progress derived from real completion dates.
 * Status transitions (completed/failed) are persisted lazily on read. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const today = userToday(user);
    const counted = await countedDatesFor(user.id, user.timezone);
    const rows = await db
      .select()
      .from(challenges)
      .where(eq(challenges.userId, user.id))
      .orderBy(desc(challenges.startDate))
      .limit(50);

    const out = [];
    for (const c of rows) {
      const progress = evaluateChallenge(c, counted, today);
      if (progress.state !== c.status) {
        await db
          .update(challenges)
          .set({ status: progress.state, completedAt: progress.state === "completed" ? new Date() : null })
          .where(eq(challenges.id, c.id));
        c.status = progress.state;
        if (progress.state === "completed") await evaluateAndAward(user.id, today);
      }
      out.push({ ...c, progress });
    }
    return jsonOk({ challenges: out });
  } catch (e) {
    return handleApiError(e, "Could not load challenges.");
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const body = await request.json().catch(() => null);
    const data = challengeCreateSchema.parse(body);
    const today = userToday(user);

    if (data.type === "monthly") {
      const [y, m] = today.split("-").map(Number);
      if (data.year > y || (data.year === y && data.month > m)) {
        return jsonError(400, "A monthly challenge cannot start in the future.");
      }
    }

    const window = challengeWindow(data.type === "ten_day" ? { type: "ten_day" } : { type: "monthly", month: data.month, year: data.year }, today);
    // Prevent overlapping challenges of the same type.
    const existing = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.userId, user.id), eq(challenges.type, data.type), eq(challenges.status, "active")));
    for (const c of existing) {
      if (c.startDate <= window.endDate && window.startDate <= c.endDate) {
        return jsonError(409, "You already have an active challenge of this type covering those dates.");
      }
    }

    const [created] = await db
      .insert(challenges)
      .values({
        userId: user.id,
        type: data.type,
        startDate: window.startDate,
        endDate: window.endDate,
        targetDays: window.targetDays,
        meta: data.type === "monthly" ? { month: data.month, year: data.year } : {},
      })
      .onConflictDoNothing()
      .returning();
    if (!created) return jsonError(409, "This challenge already exists.");

    // Backfill: a monthly challenge for a past/current month evaluates history.
    const counted = await countedDatesFor(user.id, user.timezone);
    const progress = evaluateChallenge(created, counted, today);
    if (progress.state !== "active") {
      await db
        .update(challenges)
        .set({ status: progress.state, completedAt: progress.state === "completed" ? new Date() : null })
        .where(eq(challenges.id, created.id));
      created.status = progress.state;
      if (progress.state === "completed") await evaluateAndAward(user.id, today);
    }
    return jsonOk({ challenge: { ...created, progress } }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "Could not create the challenge. Please try again.");
  }
}
