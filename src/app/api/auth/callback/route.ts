import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  if (code) {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && authData.user) {
      try {
        await ensureSchema();
        
        // Link identity
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.id, authData.user.id))
          .limit(1);

        if (!existing) {
          const email = authData.user.email || "";
          const name = authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || "";
          const image = authData.user.user_metadata?.avatar_url || null;
          
          await db.insert(users).values({
            id: authData.user.id,
            email,
            name,
            image,
            googleSub: authData.user.id,
          }).onConflictDoNothing();
          
          return NextResponse.redirect(`${origin}/onboarding`);
        }
        
        return NextResponse.redirect(`${origin}${existing.onboardingCompleted ? "/today" : "/onboarding"}`);
      } catch (dbError) {
        console.error("[auth] callback DB sync failed", dbError);
        // Fall back to onboarding if we can't verify db status (though db connection error will likely 503 later anyway)
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/today`);
}
