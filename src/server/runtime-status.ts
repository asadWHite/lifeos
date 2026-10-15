import "server-only";

export type DatabaseStatus = {
  hasDatabaseUrl: boolean;
  hasSupabaseUrl: boolean;
  hasSupabaseAnonKey: boolean;
  hasSupabaseServiceRole: boolean;
  hasSupabaseDbPassword: boolean;
};

export type DatabaseIssue = {
  kind: "missing_database_url" | "connection_failed";
  title: string;
  body: string;
  hint: string;
};

/**
 * Non-secret setup booleans safe to expose in UI/health responses.
 * We never return actual credentials, only whether the expected vars exist.
 */
export function getDatabaseStatus(): DatabaseStatus {
  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasSupabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasSupabaseDbPassword: Boolean(process.env.SUPABASE_DB_PASSWORD),
  };
}

/** Human-friendly classification for welcome/setup surfaces. */
export function classifyDatabaseIssue(error: unknown): DatabaseIssue {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown database error";
  const env = getDatabaseStatus();

  if (/DATABASE_URL is not configured/i.test(message) || !env.hasDatabaseUrl) {
    return {
      kind: "missing_database_url",
      title: "Database not connected yet",
      body: "LIFEOS needs a PostgreSQL connection string. Add DATABASE_URL in Vercel → Settings → Environment Variables.",
      hint:
        "Go to Supabase → Project Settings → Database → Connection string (URI). Copy it. Then paste it into Vercel as DATABASE_URL. Make sure 'Production' is checked. Then click Redeploy.",
    };
  }

  return {
    kind: "connection_failed",
    title: "Database connection failed",
    body:
      "LIFEOS reached the server runtime, but the PostgreSQL database could not be opened with the current DATABASE_URL.",
    hint:
      "Double-check the host, password, port, sslmode=require, and whether you're using the Supabase connection string / pooler URI. Then redeploy.",
  };
}
