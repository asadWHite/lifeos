import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { achievements } from "@/db/schema";
import { ACHIEVEMENTS, buildStatsSnapshot, evaluateAndAward } from "@/lib/achievements";
import { handleApiError, jsonOk, requireUser, userToday } from "@/lib/api-helpers";

/* Full achievement state: unlocked records + catalog progress from the
 * user's real statistics snapshot. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const today = userToday(user);
    await evaluateAndAward(user.id, today); // lazy catch-up, idempotent
    const [unlocked, snapshot] = await Promise.all([
      db.select().from(achievements).where(eq(achievements.userId, user.id)).orderBy(desc(achievements.unlockedAt)),
      buildStatsSnapshot(user.id, today),
    ]);
    const unlockedKeys = new Set(unlocked.map((a) => a.key));
    const catalog = ACHIEVEMENTS.map((a) => ({
      key: a.key,
      title: a.title,
      description: a.description,
      icon: a.icon,
      unlocked: unlockedKeys.has(a.key),
      unlockedAt: unlocked.find((u) => u.key === a.key)?.unlockedAt ?? null,
      progress: snapshot ? a.progress(snapshot) : { current: 0, target: 1 },
    }));
    return jsonOk({ achievements: catalog });
  } catch (e) {
    return handleApiError(e, "Could not load achievements.");
  }
}

/* Force re-evaluation (e.g. from Progress page). Returns only fresh unlocks. */
export async function POST() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const fresh = await evaluateAndAward(auth.user.id, userToday(auth.user));
    return jsonOk({ newAchievements: fresh });
  } catch (e) {
    return handleApiError(e, "Could not evaluate achievements.");
  }
}
