import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import { ensureSchema } from "./bootstrap";

// Keep DATE columns as raw "YYYY-MM-DD" strings instead of JS Date objects,
// which node-postgres would construct in the server's local timezone and
// could shift the calendar day for users in other timezones.
types.setTypeParser(1082, (value: string) => value);
types.setTypeParser(1114, (value: string) => new Date(value.replace(" ", "T") + "Z"));

const globalForDb = globalThis as typeof globalThis & {
  __lifeosDb?: NodePgDatabase;
  __lifeosPool?: Pool;
  __lifeosPoolUrl?: string;
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

  // If the connection string changes (e.g. after editing .env in dev), drop the
  // cached pool instead of silently talking to the old database.
  if (globalForDb.__lifeosPool && globalForDb.__lifeosPoolUrl !== databaseUrl) {
    globalForDb.__lifeosPool.end().catch(() => {});
    globalForDb.__lifeosPool = undefined;
    globalForDb.__lifeosDb = undefined;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    // Fail fast with a clear error instead of hanging a request forever when
    // the host is unreachable (a firewall swallowing packets looks like an
    // "infinite loading" page otherwise).
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: 5,
  });

  // A dropped idle connection must never take the whole server process down
  // (an unhandled 'error' event on a pg Pool is fatal in Node).
  pool.on("error", (error) => {
    console.error("[lifeos] idle database connection error:", error.message);
  });

  // Self-healing schema: before the first query of this process, make sure the
  // LIFEOS tables exist (safe, idempotent, cheap on databases that already have
  // them). Wrapped so that a bootstrap failure never blocks the query itself —
  // error handling upstream (session/welcome/health) decides what to show.
  type AnyQuery = (...args: unknown[]) => Promise<unknown>;
  const runQuery = pool.query.bind(pool) as unknown as AnyQuery;
  (pool as unknown as { query: AnyQuery }).query = async (...args: unknown[]) => {
    await ensureSchema(pool);
    return runQuery(...args);
  };

  globalForDb.__lifeosPool = pool;
  globalForDb.__lifeosPoolUrl = databaseUrl;
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

/** Direct pool access for health checks (shares the same connection). */
export function getPool(): Pool {
  if (!globalForDb.__lifeosPool) {
    // Trigger lazy creation through the proxy's internal path.
    getDb();
  }
  const pool = globalForDb.__lifeosPool;
  if (!pool) {
    throw new Error(
      "DATABASE_URL is not configured. Add it in your host's environment settings " +
        "(Vercel → Project → Settings → Environment Variables) or in a local .env file, then redeploy.",
    );
  }
  return pool;
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
