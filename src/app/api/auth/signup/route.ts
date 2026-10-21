import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { users } from "@/db/schema";
import { signupSchema } from "@/lib/validation";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json().catch(() => null);
    const data = signupSchema.parse(body);
    
    const supabase = await createClient();
    
    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    
    if (authError) {
      if (authError.message.includes("already registered")) {
        return jsonError(409, "An account with this email already exists. Try signing in.");
      }
      return jsonError(400, authError.message);
    }
    
    if (!authData.user) {
      return jsonError(500, "Failed to create user account.");
    }

    // 2. Create the user profile in our database
    try {
      await db
        .insert(users)
        .values({ 
          id: authData.user.id, 
          email: data.email, 
          name: data.name 
        })
        .onConflictDoNothing(); // In case it already exists somehow
    } catch (dbError) {
      console.error("[signup] DB Insert failed:", dbError);
      // Even if DB insert fails right now (e.g. no DB connection), the Supabase Auth succeeds.
      // But we should return a 503 if the DB is unreachable so the user knows.
      throw dbError; 
    }

    return jsonOk({ next: "/onboarding" }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "Could not create your account. Please try again.");
  }
}
