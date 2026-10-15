import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";

// Keep DATE columns as raw "YYYY-MM-DD" strings
types.setTypeParser(1082, (value: string) => value);
types.setTypeParser(1114, (value: string) => new Date(value.replace(" ", "T") + "Z"));

const globalForDb = globalThis as typeof globalThis & {
  __lifeosDb?: NodePgDatabase;
  __lifeosPool?: Pool;
};

/**
 * Resolve the database URL from environment variables.
 * Priority:
 *  1. DATABASE_URL (explicit, always wins)
 *  2. Build from Supabase env vars (SUPABASE_DB_URL or NEXT_PUBLIC_SUPABASE_URL + password)
 *  3. null (no database configured)
 */
function resolveDatabaseUrl(): string | null {
  // 1. Explicit DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // 2. Supabase direct DB URL (some Supabase integrations set this)
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }

  // 3. Try to build from NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (supabaseUrl && dbPassword) {
    // Extract project ref from https://abcdefgh.supabase.co
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      const ref = match[1];
      return `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`;
    }
  }

  return null;
}

function createDb(): NodePgDatabase {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Add it in Vercel → Settings → Environment Variables, then redeploy.",
    );
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined,
    max: 5, // serverless-friendly pool size
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });
  globalForDb.__lifeosPool = pool;
  return drizzle(pool);
}

function getDb(): NodePgDatabase {
  const cached = globalForDb.__lifeosDb;
  if (cached) return cached;
  const instance = createDb();
  globalForDb.__lifeosDb = instance;
  return instance;
}

export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});
