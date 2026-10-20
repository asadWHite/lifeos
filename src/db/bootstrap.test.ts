import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

/* Integration test: proves ensureSchema() creates the full schema on an
 * EMPTY database (exactly the state of a fresh Vercel Postgres) and is
 * idempotent. Creates and destroys its own scratch database. */

const ADMIN_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const SCRATCH = "lifeos_boot_test";
const scratchUrl = ADMIN_URL.replace(/\/[^/]+$/, `/${SCRATCH}`);

const admin = new Pool({ connectionString: ADMIN_URL });
let scratch: Pool | null = null;

beforeAll(async () => {
  await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${SCRATCH}`);
  scratch = new Pool({ connectionString: scratchUrl });
});

afterAll(async () => {
  await scratch?.end().catch(() => {});
  // Close the bootstrap module's own pool (bound to the scratch URL) before
  // dropping the database, otherwise its idle connections get killed (57P01).
  try {
    const { pool } = await import("@/db");
    await pool.end();
  } catch { /* not created in every run — fine */ }
  await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`).catch(() => {});
  await admin.end();
});

describe("ensureSchema", () => {
  it("creates all tables on an empty database, idempotently", async () => {
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = scratchUrl;
    try {
      // Fresh module graph so db/index + bootstrap bind to the scratch URL.
      const { ensureSchema } = await import(`@/db/bootstrap?scratch=${Date.now()}`);

      await ensureSchema(); // first run: creates everything
      await ensureSchema(); // second run: must be a cached no-op

      const { rows } = await scratch!.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
      );
      const names = rows.map((r) => r.table_name);
      expect(names).toEqual([
        "achievements",
        "auth_sessions",
        "challenges",
        "goals",
        "habit_completions",
        "habits",
        "sleep_schedules",
        "sleep_sessions",
        "tasks",
        "users",
      ]);

      // Core uniqueness guarantees the app relies on.
      const { rows: uniq } = await scratch!.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN
         ('habit_completions_unique_day','achievements_user_key_unique','challenges_unique_start')`,
      );
      expect(uniq.map((u) => u.indexname).sort()).toEqual([
        "achievements_user_key_unique",
        "challenges_unique_start",
        "habit_completions_unique_day",
      ]);
    } finally {
      process.env.DATABASE_URL = prev;
    }
  });

  it("returns immediately without DATABASE_URL (no crash)", async () => {
    const prev = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const { ensureSchema } = await import(`@/db/bootstrap?nodatabase=${Date.now()}`);
      await expect(ensureSchema()).resolves.toBeUndefined();
    } finally {
      process.env.DATABASE_URL = prev;
    }
  });
});
