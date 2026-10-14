import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences, profiles } from "@/db/schema";
import type { PreferencesRow, ProfileRow } from "@/db/schema";

/**
 * Session handling with Supabase Support.
 *
 * This adapter uses a local cookie for profile identification.
 * If NEXT_PUBLIC_SUPABASE_URL is set, it's ready to be extended
 * for real Supabase Auth integration.
 */

export const SESSION_COOKIE = "lifeos_profile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type SessionContext = { profile: ProfileRow; prefs: PreferencesRow };

function defaultPrefs(profileId: string): PreferencesRow {
  return {
    profileId,
    ageGroup: null,
    lifeStage: null,
    lifeStageOther: null,
    interests: [],
    interestsOther: null,
    objectives: [],
    objectivesOther: null,
    wakeTime: null,
    bedtime: null,
    commitments: null,
    personalTime: null,
    weekendVaries: null,
    planningStyle: null,
    difficulties: [],
    phoneBeforeBed: null,
    sleepTargetMinutes: null,
    hiddenSections: [],
    theme: "system",
    onboardingStep: 0,
    updatedAt: new Date(0),
  };
}

export async function getSession(): Promise<SessionContext | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const rows = await db
    .select()
    .from(profiles)
    .leftJoin(preferences, eq(preferences.profileId, profiles.id))
    .where(eq(profiles.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    profile: row.profiles,
    prefs: row.preferences ?? defaultPrefs(row.profiles.id),
  };
}

/** Redirect variants for route handlers */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/welcome");
  return session;
}

export async function requireOnboarded(): Promise<SessionContext> {
  const session = await requireSession();
  if (!session.profile.onboardingCompleted) redirect("/onboarding");
  return session;
}

export async function setSessionCookie(profileId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
