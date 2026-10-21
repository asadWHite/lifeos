import { db } from "@/db";
import { sql } from "drizzle-orm";
import { probeSupabaseRest, resolvePostgresUrl, supabaseStatus } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/* Liveness + honest dependency diagnostics (no secrets, no connection
 * strings — only presence/reachability booleans). */
export async function GET() {
  const pg = resolvePostgresUrl();
  let dbOk = false;
  if (pg.url) {
    try {
      await Promise.race([
        db.execute(sql`select 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
      ]);
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  const supa = supabaseStatus();
  const rest = await probeSupabaseRest();
  const ok = dbOk;
  return Response.json(
    {
      ok,
      db: { configured: !!pg.url, source: pg.source, reachable: dbOk },
      supabase: { configured: supa.configured, missing: supa.missing, rest: rest },
      auth: { provider: "supabase" },
    },
    { status: ok ? 200 : 503 },
  );
}
