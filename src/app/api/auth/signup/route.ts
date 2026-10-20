import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const data = signupSchema.parse(body);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
    if (existing.length > 0) {
      return jsonError(409, "An account with this email already exists. Try signing in.");
    }
    const [user] = await db
      .insert(users)
      .values({ email: data.email, name: data.name, passwordHash: hashPassword(data.password) })
      .returning({ id: users.id });
    await createSession(user.id);
    return jsonOk({ next: "/onboarding" }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "Could not create your account. Please try again.");
  }
}
