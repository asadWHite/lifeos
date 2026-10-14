import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";

// Keep DATE columns as raw "YYYY-MM-DD" strings instead of JS Date objects,
// which node-postgres would construct in the server's local timezone and
// could shift the calendar day for users in other timezones.
types.setTypeParser(1082, (value: string) => value);
types.setTypeParser(1114, (value: string) => new Date(value.replace(" ", "T") + "Z"));

const globalForDb = globalThis as typeof globalThis & {
  __lifeosDb?: NodePgDatabase;
  __lifeosPool?: Pool;
};

function createDb(): NodePgDatabase {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Build-time friendly: this throws only when a query actually runs, not
    // when the module is imported (so `next build` never fails on a missing
    // env var — you get this clear message in runtime logs instead).
    throw new Error(
      "DATABASE_URL is not configured. Add it in your host's environment settings " +
        "(Vercel → Project → Settings → Environment Variables) or in a local .env file, then redeploy.",
    );
  }
  const pool = new Pool({ connectionString: databaseUrl });
  globalForDb.__lifeosPool = pool;
  return drizzle(pool);
}

/**
 * Lazily-initialized singleton. The pool is cached on globalThis so serverless
 * warm instances (and dev hot-reloads) reuse connections instead of spawning
 * a new pool per invocation.
 */
function getDb(): NodePgDatabase {
  const cached = globalForDb.__lifeosDb;
  if (cached) return cached;
  const instance = createDb();
  globalForDb.__lifeosDb = instance;
  return instance;
}

/** Drop-in export matching `db.select()…` call sites, instantiating on first use. */
export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});
