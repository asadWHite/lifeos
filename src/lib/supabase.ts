import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Centralized Supabase configuration.
 *
 * Env conventions (Next.js):
 * - NEXT_PUBLIC_SUPABASE_URL              — https://<project-ref>.supabase.co
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — sb_publishable_* (public by design;
 *                                            safe in browsers, gated by RLS)
 *   (NEXT_PUBLIC_SUPABASE_ANON_KEY is also accepted as a legacy alias.)
 * - Postgres wire access (Drizzle/pg) resolves via resolvePostgresUrl().
 *
 * Never import a service-role key here — this module must stay safe for
 * client bundles. */

export function supabaseStatus(): { configured: boolean; url: string | null; missing: string[] } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in|dev)(:\d+)?\/?$/i.test(url)) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL (format https://<ref>.supabase.co)");
  }
  return { configured: missing.length === 0, url: url || null, missing };
}

let client: SupabaseClient | null = null;

/** Singleton browser/server-safe client, or null when not configured. */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const { configured, url } = supabaseStatus();
  if (!configured || !url) return null;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  try {
    client = createClient(url, key, { auth: { persistSession: false } });
    return client;
  } catch (e) {
    console.error("[supabase] initialization failed", e instanceof Error ? e.message : "unknown");
    return null;
  }
}

/** Live reachability probe for diagnostics (server-side, non-sensitive). */
export async function probeSupabaseRest(): Promise<"ok" | "unreachable" | "not-configured"> {
  const { configured, url } = supabaseStatus();
  if (!configured || !url) return "not-configured";
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    // 200 = fine; 404 = project reachable but no tables — still "ok" reachability.
    return res.status < 500 ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}

/* Postgres connection-string resolution, in priority order. The app talks
 * to Postgres directly (Drizzle); Supabase IS Postgres, so any of these
 * work — including the ones the Vercel↔Supabase integration auto-injects
 * when projects are linked through the dashboard. */
const PG_URL_KEYS = [
  "DATABASE_URL",
  "SUPABASE_POSTGRES_URL_NON_POOLING",
  "SUPABASE_POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "SUPABASE_DB_URL",
] as const;

export function resolvePostgresUrl(): { url: string | null; source: string | null } {
  for (const key of PG_URL_KEYS) {
    const v = process.env[key];
    if (v && v.startsWith("postgres")) return { url: v, source: key };
  }
  return { url: null, source: null };
}
