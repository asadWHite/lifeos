import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-token";
import { jsonError, jsonOk } from "@/lib/api-helpers";

/* Exchanges a verified Firebase ID token for a LifeOS server session.
 * The user's Postgres profile is created once and never overwritten by
 * subsequent sign-ins (onboarding data stays intact). */
export async function POST(request: Request) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return jsonError(503, "Firebase is not configured on this deployment.", { missing: ["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] });
  }

  let body: { idToken?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid request body.");
  }
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  if (!idToken) return jsonError(400, "Missing idToken.");

  let identity;
  try {
    identity = await verifyFirebaseIdToken(idToken, projectId);
  } catch (e) {
    console.error("[auth] firebase token verification failed:", e instanceof Error ? e.message : "unknown");
    return jsonError(401, "Your Google sign-in could not be verified. Please try again.");
  }

  try {
    await ensureSchema();
    const [existing] = await db
      .select()
      .from(users)
      .where(or(eq(users.googleSub, identity.uid), eq(users.email, identity.email)))
      .limit(1);

    let userId: string;
    let onboardingCompleted: boolean;
    if (existing) {
      userId = existing.id;
      onboardingCompleted = existing.onboardingCompleted;
      // Link Firebase identity to a pre-existing email account; never
      // clobber stored profile/onboarding data.
      if (!existing.googleSub || existing.googleSub !== identity.uid || !existing.image) {
        await db
          .update(users)
          .set({
            googleSub: identity.uid,
            image: existing.image ?? identity.picture,
            name: existing.name || identity.name,
          })
          .where(eq(users.id, userId));
      }
    } else {
      const [created] = await db
        .insert(users)
        .values({ email: identity.email, name: identity.name, googleSub: identity.uid, image: identity.picture })
        .returning({ id: users.id, onboardingCompleted: users.onboardingCompleted });
      userId = created.id;
      onboardingCompleted = created.onboardingCompleted;
    }

    await createSession(userId);
    return jsonOk({ next: onboardingCompleted ? "/today" : "/onboarding", viaGoogle: true });
  } catch (e) {
    console.error("[auth] firebase session creation failed", e);
    return jsonError(500, "Could not create your session. Please try again.");
  }
}
