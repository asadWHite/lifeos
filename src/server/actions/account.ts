"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals, preferences, profiles, tasks } from "@/db/schema";
import { clearSessionCookie, requireSession, setSessionCookie } from "@/server/session";
import { createProfileSchema, onboardingPayloadSchema, preferencesSchema } from "@/lib/validation";
import { personalize } from "@/lib/personalization";
import { guidanceForAge, type AgeGroup } from "@/lib/sleep";
import { todayInTz } from "@/lib/time";
import * as demo from "@/server/demo";

const D = demo.isDemoMode;
export type AccountResult = { ok: true } | { ok: false; error: string };
function refresh() { revalidatePath("/", "layout"); }

export async function createProfileAction(raw: unknown): Promise<AccountResult> {
  try {
    const input = createProfileSchema.parse(raw);
    if (D()) {
      const p = demo.demoCreateProfile(input.name, input.timezone || "UTC");
      await setSessionCookie(p.id);
      return { ok: true };
    }
    const rows = await db.insert(profiles).values({ name: input.name, timezone: input.timezone || "UTC" }).returning({ id: profiles.id });
    await setSessionCookie(rows[0].id);
    return { ok: true };
  } catch { return { ok: false, error: "Could not create your profile." }; }
}

export async function selectProfileAction(id: string): Promise<AccountResult> {
  try {
    if (D()) {
      if (!demo.demoGetProfile(id)) return { ok: false, error: "Profile not found." };
      await setSessionCookie(id);
      return { ok: true };
    }
    const rows = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, id)).limit(1);
    if (rows.length === 0) return { ok: false, error: "Profile not found." };
    await setSessionCookie(rows[0].id);
    return { ok: true };
  } catch { return { ok: false, error: "Could not open that profile." }; }
}

export async function signOutProfileAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/welcome");
}

export async function deleteProfileDataAction(): Promise<AccountResult> {
  try {
    const session = await requireSession();
    if (D()) { demo.demoDeleteProfile(session.profile.id); }
    else { await db.delete(profiles).where(eq(profiles.id, session.profile.id)); }
    await clearSessionCookie();
    return { ok: true };
  } catch { return { ok: false, error: "Could not delete the profile." }; }
}

export async function updateSettingsAction(raw: unknown): Promise<AccountResult> {
  try {
    const session = await requireSession();
    const input = preferencesSchema.parse(raw);
    if (D()) {
      if (input.name) demo.demoUpdateProfile(session.profile.id, { name: input.name });
      if (input.timezone) demo.demoUpdateProfile(session.profile.id, { timezone: input.timezone });
      const patch: Partial<typeof session.prefs> = {};
      if (input.sleepTargetMinutes !== undefined) patch.sleepTargetMinutes = input.sleepTargetMinutes ?? null;
      if (input.wakeTime !== undefined) patch.wakeTime = input.wakeTime ?? null;
      if (input.bedtime !== undefined) patch.bedtime = input.bedtime ?? null;
      if (input.planningStyle !== undefined) patch.planningStyle = input.planningStyle ?? null;
      if (input.phoneBeforeBed !== undefined) patch.phoneBeforeBed = input.phoneBeforeBed ?? null;
      if (input.hiddenSections !== undefined) patch.hiddenSections = input.hiddenSections;
      if (input.theme !== undefined) patch.theme = input.theme;
      demo.demoUpsertPrefs(session.profile.id, patch);
      refresh(); return { ok: true };
    }
    if (input.name !== undefined || input.timezone !== undefined) {
      const patch: { name?: string; timezone?: string } = {};
      if (input.name) patch.name = input.name;
      if (input.timezone) patch.timezone = input.timezone;
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
      await db.insert(preferences).values({ profileId: session.profile.id, ...(set as Partial<typeof preferences.$inferInsert>) })
        .onConflictDoUpdate({ target: preferences.profileId, set });
    }
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not save settings." }; }
}

export async function saveOnboardingStepAction(raw: unknown): Promise<AccountResult> {
  try {
    const session = await requireSession();
    const input = onboardingPayloadSchema.parse(raw);
    const v = input.values;
    if (D()) {
      const patch: Partial<typeof session.prefs> = { onboardingStep: input.step + 1 };
      if (v.ageGroup !== undefined) patch.ageGroup = v.ageGroup ?? null;
      if (v.lifeStage !== undefined) patch.lifeStage = v.lifeStage ?? null;
      if (v.lifeStageOther !== undefined) patch.lifeStageOther = v.lifeStageOther ?? null;
      if (v.interests !== undefined) patch.interests = v.interests;
      if (v.interestsOther !== undefined) patch.interestsOther = v.interestsOther ?? null;
      if (v.objectives !== undefined) patch.objectives = v.objectives;
      if (v.objectivesOther !== undefined) patch.objectivesOther = v.objectivesOther ?? null;
      if (v.wakeTime !== undefined) patch.wakeTime = v.wakeTime ?? null;
      if (v.bedtime !== undefined) patch.bedtime = v.bedtime ?? null;
      if (v.commitments !== undefined) patch.commitments = v.commitments ?? null;
      if (v.personalTime !== undefined) patch.personalTime = v.personalTime ?? null;
      if (v.weekendVaries !== undefined) patch.weekendVaries = v.weekendVaries ?? null;
      if (v.planningStyle !== undefined) patch.planningStyle = v.planningStyle ?? null;
      if (v.difficulties !== undefined) patch.difficulties = v.difficulties;
      if (v.phoneBeforeBed !== undefined) patch.phoneBeforeBed = v.phoneBeforeBed ?? null;
      demo.demoUpsertPrefs(session.profile.id, patch);
      return { ok: true };
    }
    const set: Record<string, unknown> = { onboardingStep: input.step + 1, updatedAt: new Date() };
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
    await db.insert(preferences).values({ profileId: session.profile.id, ...(set as Partial<typeof preferences.$inferInsert>) })
      .onConflictDoUpdate({ target: preferences.profileId, set });
    return { ok: true };
  } catch { return { ok: false, error: "Could not save your answer." }; }
}

export async function retakeOnboardingAction(): Promise<AccountResult> {
  try {
    const session = await requireSession();
    if (D()) {
      demo.demoUpdateProfile(session.profile.id, { onboardingCompleted: false });
      demo.demoUpsertPrefs(session.profile.id, { onboardingStep: 0 });
      refresh(); return { ok: true };
    }
    await db.update(profiles).set({ onboardingCompleted: false }).where(eq(profiles.id, session.profile.id));
    await db.insert(preferences).values({ profileId: session.profile.id })
      .onConflictDoUpdate({ target: preferences.profileId, set: { onboardingStep: 0, updatedAt: new Date() } });
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not restart onboarding." }; }
}

export type CompleteResult = { ok: true; firstName: string } | { ok: false; error: string };

export async function completeOnboardingAction(): Promise<CompleteResult> {
  const session = await requireSession();
  if (session.profile.onboardingCompleted) redirect("/home");
  try {
    const p = session.prefs;
    const plan = personalize({
      ageGroup: p.ageGroup, lifeStage: p.lifeStage, interests: p.interests,
      objectives: p.objectives, planningStyle: p.planningStyle,
      difficulties: p.difficulties, personalTime: p.personalTime, sleepTargetMinutes: p.sleepTargetMinutes,
    });
    const target = p.sleepTargetMinutes ?? guidanceForAge((p.ageGroup as AgeGroup) ?? null).recommendedMinutes;
    const today = todayInTz(session.profile.timezone);

    if (D()) {
      demo.demoUpsertPrefs(session.profile.id, { sleepTargetMinutes: target, onboardingStep: 0 });
      demo.demoDeleteLifeosTasks(session.profile.id);
      for (const t of plan.starterTasks) {
        demo.demoCreateTask(session.profile.id, { title: t.title, priority: t.priority, durationMinutes: t.durationMinutes, dueDate: today, source: "lifeos" });
      }
      if (plan.suggestedGoal && !demo.demoGoalByTitle(session.profile.id, plan.suggestedGoal.title)) {
        demo.demoCreateGoal(session.profile.id, { ...plan.suggestedGoal, source: "lifeos" });
      }
      demo.demoUpdateProfile(session.profile.id, { onboardingCompleted: true });
      refresh();
      return { ok: true, firstName: session.profile.name.split(" ")[0] };
    }

    await db.insert(preferences).values({ profileId: session.profile.id, sleepTargetMinutes: target, onboardingStep: 0 })
      .onConflictDoUpdate({ target: preferences.profileId, set: { sleepTargetMinutes: target, onboardingStep: 0, updatedAt: new Date() } });
    await db.delete(tasks).where(and(eq(tasks.profileId, session.profile.id), eq(tasks.source, "lifeos"), eq(tasks.status, "todo")));
    if (plan.starterTasks.length > 0) {
      await db.insert(tasks).values(plan.starterTasks.map((t) => ({
        profileId: session.profile.id, title: t.title, priority: t.priority,
        durationMinutes: t.durationMinutes, dueDate: today, source: "lifeos",
      })));
    }
    if (plan.suggestedGoal) {
      const exists = await db.select({ id: goals.id }).from(goals)
        .where(and(eq(goals.profileId, session.profile.id), eq(goals.title, plan.suggestedGoal.title))).limit(1);
      if (exists.length === 0) {
        await db.insert(goals).values({ profileId: session.profile.id, ...plan.suggestedGoal, source: "lifeos" });
      }
    }
    await db.update(profiles).set({ onboardingCompleted: true }).where(eq(profiles.id, session.profile.id));
    refresh();
    return { ok: true, firstName: session.profile.name.split(" ")[0] };
  } catch { return { ok: false, error: "Something went wrong. Please try again." }; }
}
