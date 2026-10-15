import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences, profiles } from "@/db/schema";
import type { PreferencesRow, ProfileRow } from "@/db/schema";
import * as demo from "@/server/demo";

export const SESSION_COOKIE = "lifeos_profile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type SessionContext = { profile: ProfileRow; prefs: PreferencesRow };

function defaultPrefs(profileId: string): PreferencesRow {
  return demo.demoDefaultPrefs(profileId);
}

export async function getSession(): Promise<SessionContext | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  if (demo.isDemoMode()) {
    const p = demo.demoGetProfile(id);
    if (!p) return null;
    return { profile: p, prefs: demo.demoGetPrefs(id) };
  }

  try {
    const rows = await db
      .select().from(profiles)
      .leftJoin(preferences, eq(preferences.profileId, profiles.id))
      .where(eq(profiles.id, id)).limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    return { profile: row.profiles, prefs: row.preferences ?? defaultPrefs(row.profiles.id) };
  } catch (error) {
    console.error("[lifeos] session lookup failed:", error);
    return null;
  }
}

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
    httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
