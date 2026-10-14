import "server-only";
import type { Pool } from "pg";

/**
 * Self-healing schema bootstrap.
 *
 * LIFEOS ships as a single-binary-ish web app: people deploy it to Vercel with a
 * fresh PostgreSQL/Supabase database and expect it to just work. Before this
 * file existed, a database that was reachable but had no tables made the welcome
 * screen show "Database connection failed" — a message that was both wrong (the
 * connection was fine) and a dead end (the CLI command `drizzle-kit push` is not
 * something you can run from a phone or from a Vercel deployment).
 *
 * So: on the first query of every server process we check for the `profiles`
 * table, and if the database is empty we create the whole LIFEOS schema with
 * idempotent DDL. It is safe to run concurrently (advisory lock), safe to run on
 * a database that already has the schema (one cheap check, then it never runs
 * again), and safe to run after `drizzle-kit push` (the statements are exactly
 * what drizzle-kit generates, only with IF NOT EXISTS guards).
 *
 * Set LIFEOS_AUTO_SCHEMA=false to opt out (e.g. a database where the app user
 * may not run DDL). In that case run `npx drizzle-kit push` yourself.
 */

/** Arbitrary but stable lock key: "lifeos schema bootstrap". */
const ADVISORY_LOCK_KEY_SQL = "8217264931115";
const RETRY_AFTER_MS = 30_000;

const REQUIRED_TABLES = [
  "profiles",
  "preferences",
  "goals",
  "tasks",
  "sleep_sessions",
  "daily_checkins",
  "assistant_messages",
] as const;

/** One cheap round trip that answers "is the LIFEOS schema complete?". */
export const SCHEMA_READY_SQL = `select (${REQUIRED_TABLES.map(
  (t) => `to_regclass('public.${t}') is not null`,
).join(" and ")}) as ready`;

type SchemaState = {
  status: "unknown" | "ready" | "failed";
  at: number;
  inflight: Promise<void> | null;
};

const globalForSchema = globalThis as typeof globalThis & {
  __lifeosSchema?: SchemaState;
};

function state(): SchemaState {
  globalForSchema.__lifeosSchema ??= { status: "unknown", at: 0, inflight: null };
  return globalForSchema.__lifeosSchema;
}

export function isAutoSchemaEnabled(): boolean {
  return process.env.LIFEOS_AUTO_SCHEMA !== "false";
}

/**
 * Idempotent DDL, mirroring src/db/schema.ts (drizzle-kit output + guards).
 * Everything is schema-qualified with `public` so it lands where Drizzle reads.
 */
const SCHEMA_STATEMENTS: string[] = [
  // gen_random_uuid(): built into PostgreSQL 13+, and provided by pgcrypto on
  // older servers. Never fatal — some managed databases forbid CREATE EXTENSION.
  `do $$ begin create extension if not exists pgcrypto; exception when others then null; end $$;`,

  `create table if not exists "public"."profiles" (
    "id" uuid primary key default gen_random_uuid() not null,
    "name" text not null,
    "timezone" text default 'UTC' not null,
    "onboarding_completed" boolean default false not null,
    "created_at" timestamp with time zone default now() not null
  );`,

  `create table if not exists "public"."preferences" (
    "profile_id" uuid primary key not null,
    "age_group" text,
    "life_stage" text,
    "life_stage_other" text,
    "interests" jsonb default '[]'::jsonb not null,
    "interests_other" text,
    "objectives" jsonb default '[]'::jsonb not null,
    "objectives_other" text,
    "wake_time" text,
    "bedtime" text,
    "commitments" text,
    "personal_time" text,
    "weekend_varies" boolean,
    "planning_style" text,
    "difficulties" jsonb default '[]'::jsonb not null,
    "phone_before_bed" text,
    "sleep_target_minutes" integer,
    "hidden_sections" jsonb default '[]'::jsonb not null,
    "theme" text default 'system' not null,
    "onboarding_step" integer default 0 not null,
    "updated_at" timestamp with time zone default now() not null
  );`,

  `create table if not exists "public"."goals" (
    "id" uuid primary key default gen_random_uuid() not null,
    "profile_id" uuid not null,
    "title" text not null,
    "description" text,
    "category" text default 'personal' not null,
    "target_date" date,
    "status" text default 'active' not null,
    "metric_target" integer,
    "metric_unit" text,
    "metric_progress" integer default 0 not null,
    "source" text default 'user' not null,
    "created_at" timestamp with time zone default now() not null
  );`,

  `create table if not exists "public"."tasks" (
    "id" uuid primary key default gen_random_uuid() not null,
    "profile_id" uuid not null,
    "goal_id" uuid,
    "title" text not null,
    "notes" text,
    "due_date" date,
    "priority" text default 'normal' not null,
    "duration_minutes" integer,
    "status" text default 'todo' not null,
    "source" text default 'user' not null,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now() not null
  );`,

  `create table if not exists "public"."sleep_sessions" (
    "id" uuid primary key default gen_random_uuid() not null,
    "profile_id" uuid not null,
    "started_at" timestamp with time zone not null,
    "ended_at" timestamp with time zone,
    "duration_minutes" integer,
    "manual" boolean default false not null,
    "created_at" timestamp with time zone default now() not null
  );`,

  `create table if not exists "public"."daily_checkins" (
    "id" uuid primary key default gen_random_uuid() not null,
    "profile_id" uuid not null,
    "day" date not null,
    "energy" text,
    "activity_minutes" integer,
    "note" text,
    "created_at" timestamp with time zone default now() not null
  );`,

  `create table if not exists "public"."assistant_messages" (
    "id" uuid primary key default gen_random_uuid() not null,
    "profile_id" uuid not null,
    "role" text not null,
    "content" text not null,
    "origin" text default 'rules' not null,
    "created_at" timestamp with time zone default now() not null
  );`,

  // Foreign keys. ADD CONSTRAINT is not idempotent, so each one tolerates the
  // "already exists" case (duplicate_object) instead of failing the bootstrap.
  ...[
    `alter table "public"."assistant_messages" add constraint "assistant_messages_profile_id_profiles_id_fk" foreign key ("profile_id") references "public"."profiles"("id") on delete cascade on update no action;`,
    `alter table "public"."daily_checkins" add constraint "daily_checkins_profile_id_profiles_id_fk" foreign key ("profile_id") references "public"."profiles"("id") on delete cascade on update no action;`,
    `alter table "public"."goals" add constraint "goals_profile_id_profiles_id_fk" foreign key ("profile_id") references "public"."profiles"("id") on delete cascade on update no action;`,
    `alter table "public"."preferences" add constraint "preferences_profile_id_profiles_id_fk" foreign key ("profile_id") references "public"."profiles"("id") on delete cascade on update no action;`,
    `alter table "public"."sleep_sessions" add constraint "sleep_sessions_profile_id_profiles_id_fk" foreign key ("profile_id") references "public"."profiles"("id") on delete cascade on update no action;`,
    `alter table "public"."tasks" add constraint "tasks_profile_id_profiles_id_fk" foreign key ("profile_id") references "public"."profiles"("id") on delete cascade on update no action;`,
    `alter table "public"."tasks" add constraint "tasks_goal_id_goals_id_fk" foreign key ("goal_id") references "public"."goals"("id") on delete set null on update no action;`,
  ].map(
    (ddl) =>
      `do $$ begin ${ddl} exception when duplicate_object then null; when others then null; end $$;`,
  ),

  `create unique index if not exists "daily_checkins_profile_day" on "public"."daily_checkins" using btree ("profile_id","day");`,
];

async function querySchemaReady(client: {
  query: (text: string) => Promise<{ rows: Array<{ ready: boolean }> }>;
}): Promise<boolean> {
  const res = await client.query(SCHEMA_READY_SQL);
  return Boolean(res.rows[0]?.ready);
}

async function runBootstrap(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Fast path: schema already present → nothing to do, ever again this process.
    if (await querySchemaReady(client)) return;

    await client.query("begin");
    // Serialize concurrent bootstraps (multiple serverless instances, dev reloads).
    await client.query(
      `select pg_advisory_xact_lock(${ADVISORY_LOCK_KEY_SQL})`,
    );

    // Another instance may have created everything while we waited for the lock.
    if (await querySchemaReady(client)) {
      await client.query("commit");
      return;
    }

    for (const statement of SCHEMA_STATEMENTS) {
      await client.query(statement);
    }
    await client.query("commit");
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore: the transaction is already gone (e.g. connection dropped)
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ensures the LIFEOS tables exist. Called automatically before the first query
 * of a pooled connection; never throws into a user-facing code path — a failure
 * here is logged and the original query is attempted, so the normal error
 * handling (and the setup card) can explain what is actually wrong.
 */
export async function ensureSchema(pool: Pool): Promise<void> {
  const s = state();
  if (s.status === "ready") return;
  if (!isAutoSchemaEnabled()) {
    s.status = "ready";
    return;
  }
  if (s.status === "failed" && Date.now() - s.at < RETRY_AFTER_MS) return;

  if (!s.inflight) {
    s.inflight = runBootstrap(pool)
      .then(() => {
        s.status = "ready";
        s.at = Date.now();
      })
      .catch((error) => {
        s.status = "failed";
        s.at = Date.now();
        console.error(
          "[lifeos] automatic schema setup failed — continuing with the existing database:",
          error instanceof Error ? error.message : error,
        );
      })
      .finally(() => {
        s.inflight = null;
      });
  }
  await s.inflight;
}

/** Test/ops helper: forget the cached schema status (forces a fresh check). */
export function resetSchemaCache(): void {
  globalForSchema.__lifeosSchema = { status: "unknown", at: 0, inflight: null };
}

/**
 * Truthful readiness probe for /api/health: connected *and* the tables exist.
 * Never throws — returns the plain answer.
 */
export async function checkSchemaReady(
  pool: Pool,
): Promise<{ ready: boolean; error?: string }> {
  try {
    const res = await pool.query<{ ready: boolean }>(SCHEMA_READY_SQL);
    return { ready: Boolean(res.rows[0]?.ready) };
  } catch (error) {
    return {
      ready: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
