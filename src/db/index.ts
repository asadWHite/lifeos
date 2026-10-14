import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";

// Keep DATE columns as raw "YYYY-MM-DD" strings instead of JS Date objects,
// which node-postgres would construct in the server's local timezone and
// could shift the calendar day for users in other timezones.
types.setTypeParser(1082, (value: string) => value);
types.setTypeParser(1114, (value: string) => new Date(value.replace(" ", "T") + "Z"));

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
