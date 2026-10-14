import "server-only";

export type DatabaseStatus = {
  hasDatabaseUrl: boolean;
  hasSupabaseUrl: boolean;
  hasSupabaseAnonKey: boolean;
  hasSupabaseServiceRole: boolean;
};

export type DatabaseIssue = {
  kind: "missing_database_url" | "connection_failed" | "schema_missing";
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
  };
}

/**
 * Drizzle wraps driver errors ("Failed query: select …" with the real PostgreSQL
 * error as `cause`), so the useful signal — the SQLSTATE code and the server
 * message — is one or more levels down. Walk the chain and collect both.
 */
function collectErrorSignals(error: unknown): { message: string; codes: string[] } {
  const messages: string[] = [];
  const codes: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < 6 && current != null; depth += 1) {
    if (current instanceof Error) messages.push(current.message);
    else if (typeof current === "string") messages.push(current);

    if (typeof current !== "object") break;
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && code) codes.push(code);
    current = (current as { cause?: unknown }).cause;
  }

  return { message: messages.join(" — ") || "Unknown database error", codes };
}

/** "profiles" table (or any dependency) is missing from an otherwise open DB. */
function looksLikeMissingTable(message: string, codes: string[]): boolean {
  if (codes.includes("42P01")) return true; // undefined_table
  return /does not exist/i.test(message) && /relation|table|profiles/i.test(message);
}

/** The database is reachable but LIFEOS has no tables in it. */
export function schemaMissingIssue(): DatabaseIssue {
  return {
    kind: "schema_missing",
    title: "Database connected — tables are missing",
    body:
      "The connection to PostgreSQL works, but LIFEOS could not find its tables in this database. Automatic table setup did not finish (it may be switched off with LIFEOS_AUTO_SCHEMA=false, or the database user may not be allowed to create tables).",
    hint:
      "Either remove LIFEOS_AUTO_SCHEMA=false and redeploy so LIFEOS can create its tables, or run `npx drizzle-kit push` against this database once from a computer.",
  };
}

/** Human-friendly classification for welcome/setup surfaces. */
export function classifyDatabaseIssue(error: unknown): DatabaseIssue {
  const { message, codes } = collectErrorSignals(error);
  const env = getDatabaseStatus();

  if (/DATABASE_URL is not configured/i.test(message) || !env.hasDatabaseUrl) {
    return {
      kind: "missing_database_url",
      title: "Database setup is incomplete",
      body:
        env.hasSupabaseUrl || env.hasSupabaseAnonKey || env.hasSupabaseServiceRole
          ? "Supabase API keys are present, but LIFEOS still needs a PostgreSQL connection string in DATABASE_URL. API keys are not database connection strings."
          : "LIFEOS needs a PostgreSQL connection string in DATABASE_URL before profiles, tasks, sleep, and goals can be stored.",
      hint:
        "Supabase → Settings → Database → Connection string → URI. Paste that value into Vercel as DATABASE_URL, then redeploy.",
    };
  }

  if (looksLikeMissingTable(message, codes)) {
    return schemaMissingIssue();
  }

  return {
    kind: "connection_failed",
    title: "Database connection failed",
    body:
      `LIFEOS reached the server runtime, but it could not open the PostgreSQL database with the current DATABASE_URL.${describeConnectionCause(message, codes)}`,
    hint:
      "In Supabase: Settings → Database → Connection string → URI. On Vercel the pooler URI (port 6543, …pooler.supabase.com) works best; keep sslmode=require. Then redeploy.",
  };
}

/** A short, plain-language reason extracted from the driver error, if we know it. */
function describeConnectionCause(message: string, codes: string[]): string {
  if (codes.includes("28P01") || /password authentication failed/i.test(message)) {
    return " The database rejected the password in DATABASE_URL.";
  }
  if (codes.includes("3D000") || /database .* does not exist/i.test(message)) {
    return " The database name in DATABASE_URL does not exist on that server.";
  }
  if (codes.includes("ENOTFOUND") || /getaddrinfo|ENOTFOUND/i.test(message)) {
    return " The database host name could not be found — check the server address.";
  }
  if (codes.includes("ECONNREFUSED")) {
    return " The server refused the connection — check the host and port.";
  }
  if (/connection timeout|timeout expired|ETIMEDOUT/i.test(message)) {
    return " The database did not answer in time — check the host, port, and SSL mode.";
  }
  if (/self.signed certificate|certificate/i.test(message)) {
    return " The SSL certificate could not be verified — Supabase needs sslmode=require.";
  }
  return "";
}
