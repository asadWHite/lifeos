import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handleApiError, jsonOk, requireUser } from "@/lib/api-helpers";
import { safeTimezone } from "@/lib/dates";
import { profilePatchSchema } from "@/lib/validation";

/* Updates the user profile / preferences. Every field validated, merged,
 * persisted; the client shows confirmation only after this succeeds. */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const body = await request.json().catch(() => null);
    const data = profilePatchSchema.parse(body ?? {});

    const patch: Partial<typeof users.$inferInsert> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.nickname !== undefined) patch.nickname = data.nickname;
    if (data.dob !== undefined) patch.dob = data.dob;
    if (data.timezone !== undefined) patch.timezone = safeTimezone(data.timezone);
    if (data.theme !== undefined) patch.theme = data.theme;
    if (data.remindersEnabled !== undefined) patch.remindersEnabled = data.remindersEnabled;
    if (data.reminderStyle !== undefined) patch.reminderStyle = data.reminderStyle;
    if (data.planningStyle !== undefined) patch.planningStyle = data.planningStyle;
    if (data.lifeSituation !== undefined) patch.lifeSituation = data.lifeSituation;
    if (data.interests !== undefined) patch.interests = data.interests;
    if (data.responsibilities !== undefined) patch.responsibilities = data.responsibilities;
    if (data.habitFocus !== undefined) patch.habitFocus = data.habitFocus;

    const schedule = { ...(user.schedule ?? {}) } as Record<string, string>;
    let scheduleTouched = false;
    if (data.wakeTime !== undefined) { schedule.wakeTime = data.wakeTime ?? ""; scheduleTouched = true; }
    if (data.bedTime !== undefined) { schedule.bedTime = data.bedTime ?? ""; scheduleTouched = true; }
    if (scheduleTouched) patch.schedule = schedule;

    const phone = { ...(user.phoneHabits ?? {}) } as Record<string, string>;
    let phoneTouched = false;
    if (data.phoneBeforeBed !== undefined) { phone.beforeBed = data.phoneBeforeBed ?? ""; phoneTouched = true; }
    if (data.phoneAfterWake !== undefined) { phone.afterWake = data.phoneAfterWake ?? ""; phoneTouched = true; }
    if (phoneTouched) patch.phoneHabits = phone;

    const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
    const { passwordHash: _ph, ...safe } = updated;
    return jsonOk({ user: safe });
  } catch (e) {
    return handleApiError(e, "Could not save your profile. Please try again.");
  }
}
