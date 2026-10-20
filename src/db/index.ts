import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolvePostgresUrl } from "@/lib/supabase";

/* Resolves from DATABASE_URL or any Supabase/Postgres env the Vercel
 * integration may inject (see resolvePostgresUrl). Don't crash at import
 * time when unset: the pool fails lazily on first query; API routes surface
 * that as a clear 503 and session lookups degrade to "signed out". */
const { url: databaseUrl, source } = resolvePostgresUrl();

if (!databaseUrl) {
  console.warn("[db] No Postgres connection string found (DATABASE_URL / SUPABASE_POSTGRES_URL / POSTGRES_URL) — database calls will fail until one is configured.");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl ?? "postgresql://localhost:5432/lifeos_missing_config",
    connectionTimeoutMillis: 3000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
