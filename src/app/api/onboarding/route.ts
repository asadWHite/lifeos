import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handleApiError, jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { safeTimezone } from "@/lib/dates";
import { onboardingPatchSchema } from "@/lib/validation";

/* Saves onboarding progress. Every step persists immediately, so an
 * interrupted flow resumes exactly where it left off. Completion is stored
 * on the user record so onboarding never repeats unnecessarily. */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  try {
    const body = await request.json().catch(() => null);
    const data = onboardingPatchSchema.parse(body ?? {});

    const patch: Partial<typeof users.$inferInsert> = {};
    if (data.step !== undefined) patch.onboardingStep = Math.max(0, data.step);
    if (data.name !== undefined) patch.name = data.name;
    if (data.nickname !== undefined) patch.nickname = data.nickname;
    if (data.dob !== undefined) patch.dob = data.dob ? data.dob : null;
    if (data.timezone !== undefined) patch.timezone = safeTimezone(data.timezone);
    if (data.lifeSituation !== undefined) patch.lifeSituation = data.lifeSituation;
    if (data.responsibilities !== undefined) patch.responsibilities = data.responsibilities;
    if (data.interests !== undefined) patch.interests = data.interests;
    if (data.goalNotes !== undefined) patch.goalNotes = data.goalNotes;
    if (data.habitFocus !== undefined) patch.habitFocus = data.habitFocus;
    if (data.reminderStyle !== undefined) patch.reminderStyle = data.reminderStyle;
    if (data.planningStyle !== undefined) patch.planningStyle = data.planningStyle;

    const schedule = { ...(user.schedule ?? {}) } as Record<string, string>;
    let scheduleTouched = false;
    if (data.wakeTime !== undefined) { schedule.wakeTime = data.wakeTime ?? ""; scheduleTouched = true; }
    if (data.bedTime !== undefined) { schedule.bedTime = data.bedTime ?? ""; scheduleTouched = true; }
    if (data.commitment !== undefined) { schedule.commitment = data.commitment; scheduleTouched = true; }
    if (data.focusTime !== undefined) { schedule.focusTime = data.focusTime; scheduleTouched = true; }
    if (scheduleTouched) patch.schedule = schedule;

    const phone = { ...(user.phoneHabits ?? {}) } as Record<string, string>;
    let phoneTouched = false;
    if (data.phoneBeforeBed !== undefined) { phone.beforeBed = data.phoneBeforeBed ?? ""; phoneTouched = true; }
    if (data.phoneAfterWake !== undefined) { phone.afterWake = data.phoneAfterWake ?? ""; phoneTouched = true; }
    if (phoneTouched) patch.phoneHabits = phone;

    // Required validation on completion: name + a life situation.
    if (data.complete) {
      const finalName = patch.name ?? user.name;
      const finalSituation = patch.lifeSituation !== undefined ? patch.lifeSituation : user.lifeSituation;
      if (!finalName?.trim()) return jsonError(422, "Please enter your name before finishing.");
      if (!finalSituation) return jsonError(422, "Please choose the life situation that fits you best.");
      patch.onboardingCompleted = true;
    }

    await db.update(users).set(patch).where(eq(users.id, user.id));
    return jsonOk({ completed: data.complete === true, next: data.complete ? "/today" : null });
  } catch (e) {
    return handleApiError(e, "Could not save your answers. Please try again.");
  }
}
