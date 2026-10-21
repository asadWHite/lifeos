import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signinSchema } from "@/lib/validation";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json().catch(() => null);
    const data = signinSchema.parse(body);
    
    const supabase = await createClient();
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    
    if (authError || !authData.user) {
      return jsonError(401, "Incorrect email or password.");
    }
    
    // Check if user exists in public.users, if not create them (e.g., if they were created via OAuth)
    const [user] = await db.select().from(users).where(eq(users.id, authData.user.id)).limit(1);
    
    if (!user) {
      await db.insert(users).values({
        id: authData.user.id,
        email: data.email,
        name: "", // Will be filled during onboarding
      }).onConflictDoNothing();
      return jsonOk({ next: "/onboarding" });
    }

    return jsonOk({ next: user.onboardingCompleted ? "/today" : "/onboarding" });
  } catch (e) {
    return handleApiError(e, "Could not sign you in. Please try again.");
  }
}
