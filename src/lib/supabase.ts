import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Supabase client for Auth and RLS-aware requests.
 * Uses the anon key for public/client-side access.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side admin client. Use ONLY in server-side logic.
 * Bypasses RLS - keep this secret.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
