import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sleepSchedules } from "@/db/schema";
import { handleApiError, jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { MIN_VALID_DURATION_MIN } from "@/lib/sleep";
import { parseTimeToMin } from "@/lib/dates";
import { sleepScheduleSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const [row] = await db
    .select()
    .from(sleepSchedules)
    .where(eq(sleepSchedules.userId, auth.user.id))
    .limit(1);
  return jsonOk({ schedule: row ?? null });
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    const data = sleepScheduleSchema.parse(body);
    const bed = parseTimeToMin(data.bedtime)!;
    const wake = parseTimeToMin(data.wakeTime)!;
    const duration = ((wake - bed) % 1440 + 1440) % 1440;
    if (duration < MIN_VALID_DURATION_MIN || duration > 16 * 60) {
      return jsonError(422, "Target sleep must be between 2 and 16 hours.");
    }
    const [row] = await db
      .insert(sleepSchedules)
      .values({ userId: auth.user.id, bedtime: data.bedtime, wakeTime: data.wakeTime, toleranceMin: data.toleranceMin, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sleepSchedules.userId,
        set: { bedtime: data.bedtime, wakeTime: data.wakeTime, toleranceMin: data.toleranceMin, updatedAt: new Date() },
      })
      .returning();
    return jsonOk({ schedule: row });
  } catch (e) {
    return handleApiError(e, "Could not save the sleep schedule. Please try again.");
  }
}
