"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals, preferences, profiles, tasks } from "@/db/schema";
import {
  clearSessionCookie,
  requireSession,
  setSessionCookie,
} from "@/server/session";
import {
  createProfileSchema,
  onboardingPayloadSchema,
  preferencesSchema,
} from "@/lib/validation";
import { personalize } from "@/lib/personalization";
import { guidanceForAge, type AgeGroup } from "@/lib/sleep";
import { todayInTz } from "@/lib/time";

export type AccountResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/", "layout");
}

// -------------------------------------------------------------- profiles ---

export async function createProfileAction(raw: unknown): Promise<AccountResult> {
  try {
    const input = createProfileSchema.parse(raw);
    const rows = await db
      .insert(profiles)
      .values({ name: input.name, timezone: input.timezone || "UTC" })
      .returning({ id: profiles.id });
    await setSessionCookie(rows[0].id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not create your profile. Please try again." };
  }
}

export async function selectProfileAction(id: string): Promise<AccountResult> {
  try {
    const rows = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, id)).limit(1);
    if (rows.length === 0) return { ok: false, error: "Profile not found." };
    await setSessionCookie(rows[0].id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not open that profile." };
  }
}

export async function signOutProfileAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/welcome");
}

export async function deleteProfileDataAction(): Promise<AccountResult> {
  try {
    const session = await requireSession();
    await db.delete(profiles).where(eq(profiles.id, session.profile.id));
    await clearSessionCookie();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete the profile." };
  }
}

// ------------------------------------------------------------- settings ---

export async function updateSettingsAction(raw: unknown): Promise<AccountResult> {
  try {
    const session = await requireSession();
    const input = preferencesSchema.parse(raw);

    if (input.name !== undefined || input.timezone !== undefined) {
      const patch: { name?: string; timezone?: string } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.timezone !== undefined) patch.timezone = input.timezone;
      await db.update(profiles).set(patch).where(eq(profiles.id, session.profile.id));
    }

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (input.sleepTargetMinutes !== undefined) set.sleepTargetMinutes = input.sleepTargetMinutes ?? null;
    if (input.wakeTime !== undefined) set.wakeTime = input.wakeTime ?? null;
    if (input.bedtime !== undefined) set.bedtime = input.bedtime ?? null;
    if (input.planningStyle !== undefined) set.planningStyle = input.planningStyle ?? null;
    if (input.phoneBeforeBed !== undefined) set.phoneBeforeBed = input.phoneBeforeBed ?? null;
    if (input.hiddenSections !== undefined) set.hiddenSections = input.hiddenSections;
    if (input.theme !== undefined) set.theme = input.theme;

    if (Object.keys(set).length > 1) {
      await db
        .insert(preferences)
        .values({ profileId: session.profile.id, ...(set as Partial<typeof preferences.$inferInsert>) })
        .onConflictDoUpdate({ target: preferences.profileId, set });
    }
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save settings." };
  }
}

// ------------------------------------------------------------ onboarding ---

export async function saveOnboardingStepAction(raw: unknown): Promise<AccountResult> {
  try {
    const session = await requireSession();
    const input = onboardingPayloadSchema.parse(raw);
    const v = input.values;
    const set: Record<string, unknown> = {
      onboardingStep: input.step + 1,
      updatedAt: new Date(),
    };
    if (v.ageGroup !== undefined) set.ageGroup = v.ageGroup ?? null;
    if (v.lifeStage !== undefined) set.lifeStage = v.lifeStage ?? null;
    if (v.lifeStageOther !== undefined) set.lifeStageOther = v.lifeStageOther ?? null;
    if (v.interests !== undefined) set.interests = v.interests;
    if (v.interestsOther !== undefined) set.interestsOther = v.interestsOther ?? null;
    if (v.objectives !== undefined) set.objectives = v.objectives;
    if (v.objectivesOther !== undefined) set.objectivesOther = v.objectivesOther ?? null;
    if (v.wakeTime !== undefined) set.wakeTime = v.wakeTime ?? null;
    if (v.bedtime !== undefined) set.bedtime = v.bedtime ?? null;
    if (v.commitments !== undefined) set.commitments = v.commitments ?? null;
    if (v.personalTime !== undefined) set.personalTime = v.personalTime ?? null;
    if (v.weekendVaries !== undefined) set.weekendVaries = v.weekendVaries ?? null;
    if (v.planningStyle !== undefined) set.planningStyle = v.planningStyle ?? null;
    if (v.difficulties !== undefined) set.difficulties = v.difficulties;
    if (v.phoneBeforeBed !== undefined) set.phoneBeforeBed = v.phoneBeforeBed ?? null;

    await db
      .insert(preferences)
      .values({
        profileId: session.profile.id,
        ...(set as Partial<typeof preferences.$inferInsert>),
      })
      .onConflictDoUpdate({ target: preferences.profileId, set });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save your answer." };
  }
}

/** Re-open onboarding with existing answers prefilled (preferences are kept). */
export async function retakeOnboardingAction(): Promise<AccountResult> {
  try {
    const session = await requireSession();
    await db
      .update(profiles)
      .set({ onboardingCompleted: false })
      .where(eq(profiles.id, session.profile.id));
    await db
      .insert(preferences)
      .values({ profileId: session.profile.id })
      .onConflictDoUpdate({ target: preferences.profileId, set: { onboardingStep: 0, updatedAt: new Date() } });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not restart onboarding." };
  }
}

export type CompleteResult = { ok: true; firstName: string } | { ok: false; error: string };

/**
 * Finish onboarding: save a default sleep target, create the small editable
 * initial plan (tasks + one suggested goal), and mark onboarding complete.
 */
export async function completeOnboardingAction(): Promise<CompleteResult> {
  const session = await requireSession();
  if (session.profile.onboardingCompleted) {
    redirect("/home");
  }
  try {
    const p = session.prefs;
    const plan = personalize({
      ageGroup: p.ageGroup,
      lifeStage: p.lifeStage,
      interests: p.interests,
      objectives: p.objectives,
      planningStyle: p.planningStyle,
      difficulties: p.difficulties,
      personalTime: p.personalTime,
      sleepTargetMinutes: p.sleepTargetMinutes,
    });

    // Default sleep target from age-appropriate guidance — user-editable.
    const target =
      p.sleepTargetMinutes ?? guidanceForAge((p.ageGroup as AgeGroup) ?? null).recommendedMinutes;
    await db
      .insert(preferences)
      .values({
        profileId: session.profile.id,
        sleepTargetMinutes: target,
        onboardingStep: 0,
      })
      .onConflictDoUpdate({
        target: preferences.profileId,
        set: { sleepTargetMinutes: target, onboardingStep: 0, updatedAt: new Date() },
      });

    const today = todayInTz(session.profile.timezone);
    // Retaking onboarding replaces the previous *suggested* (uncompleted) plan
    // so users never end up with duplicate starter tasks.
    await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.profileId, session.profile.id),
          eq(tasks.source, "lifeos"),
          eq(tasks.status, "todo"),
        ),
      );
    if (plan.starterTasks.length > 0) {
      await db.insert(tasks).values(
        plan.starterTasks.map((t) => ({
          profileId: session.profile.id,
          title: t.title,
          priority: t.priority,
          durationMinutes: t.durationMinutes,
          dueDate: today,
          source: "lifeos",
        })),
      );
    }
    if (plan.suggestedGoal) {
      const sameTitle = await db
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.profileId, session.profile.id), eq(goals.title, plan.suggestedGoal.title)))
        .limit(1);
      if (sameTitle.length === 0) {
        await db.insert(goals).values({
          profileId: session.profile.id,
          title: plan.suggestedGoal.title,
          description: plan.suggestedGoal.description,
          category: plan.suggestedGoal.category,
          source: "lifeos",
        });
      }
    }

    await db
      .update(profiles)
      .set({ onboardingCompleted: true })
      .where(eq(profiles.id, session.profile.id));
    refresh();
    return { ok: true, firstName: session.profile.name.split(" ")[0] };
  } catch {
    return { ok: false, error: "Something went wrong while finishing setup. Please try again." };
  }
}
