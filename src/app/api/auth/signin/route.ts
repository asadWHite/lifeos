import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";
import { signinSchema } from "@/lib/validation";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json().catch(() => null);
    const data = signinSchema.parse(body);
    const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    // Uniform error to avoid account enumeration.
    if (!user || !user.passwordHash || !verifyPassword(data.password, user.passwordHash)) {
      return jsonError(401, "Incorrect email or password.");
    }
    await createSession(user.id);
    return jsonOk({ next: user.onboardingCompleted ? "/today" : "/onboarding" });
  } catch (e) {
    return handleApiError(e, "Could not sign you in. Please try again.");
  }
}
