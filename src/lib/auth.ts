import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

/** Returns the authenticated user or null. Degrades gracefully if DB is missing. */
export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) return null;

    await ensureSchema(); // self-bootstrap on any reachable host
    
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, data.user.id))
      .limit(1);
      
    return rows[0] ?? null;
  } catch (e) {
    console.error("[auth] session lookup failed", e instanceof Error ? e.message : "unknown");
    return null;
  }
}
