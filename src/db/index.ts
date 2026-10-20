import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

/* Don't crash at import time when DATABASE_URL is missing (e.g. a fresh
 * Vercel deployment before a hosted Postgres is attached). The pool fails
 * lazily on first query; API routes surface that as a clear 503 and
 * session lookups degrade to "signed out" instead of a white screen. */
if (!databaseUrl) {
  console.warn("[db] DATABASE_URL is not set — database calls will fail until it is configured.");
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
