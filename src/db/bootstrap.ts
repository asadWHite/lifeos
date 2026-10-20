import { pool } from "@/db";

/* Idempotent schema bootstrap.
 *
 * Production on Vercel cannot run `drizzle-kit push` by itself, but any
 * freshly attached hosted Postgres (Vercel Postgres, Supabase Postgres,
 * Neon, …) works the moment DATABASE_URL is present: the first query waits
 * for this once-per-cold-start DDL pass. Every statement is idempotent
 * (IF NOT EXISTS), so local development with `drizzle-kit push` and repeated
 * cold starts are all no-ops. THIS IS NOT A MIGRATION SYSTEM — it never
 * alters or drops; it only guarantees the base schema exists. */

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text,
  google_sub text UNIQUE,
  name text NOT NULL DEFAULT '',
  nickname text,
  image text,
  dob text,
  timezone text NOT NULL DEFAULT 'Asia/Tashkent',
  theme text NOT NULL DEFAULT 'dark',
  onboarding_step integer NOT NULL DEFAULT 0,
  onboarding_completed boolean NOT NULL DEFAULT false,
  life_situation text,
  responsibilities text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  goal_notes text NOT NULL DEFAULT '',
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone_habits jsonb NOT NULL DEFAULT '{}'::jsonb,
  habit_focus text[] NOT NULL DEFAULT '{}',
  reminder_style text NOT NULL DEFAULT 'gentle',
  planning_style text NOT NULL DEFAULT 'balanced',
  reminders_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'personal',
  target_date text,
  target_value integer,
  current_value integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goals_user_idx ON goals(user_id);
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  date text NOT NULL,
  start_time text,
  end_time text,
  priority text NOT NULL DEFAULT 'medium',
  category text NOT NULL DEFAULT 'personal',
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_user_date_idx ON tasks(user_id, date);
CREATE INDEX IF NOT EXISTS tasks_user_status_idx ON tasks(user_id, status);
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habits_user_idx ON habits(user_id);
CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS habit_completions_unique_day ON habit_completions(habit_id, date);
CREATE INDEX IF NOT EXISTS habit_completions_user_idx ON habit_completions(user_id, date);
CREATE TABLE IF NOT EXISTS sleep_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bedtime text NOT NULL DEFAULT '23:00',
  wake_time text NOT NULL DEFAULT '07:00',
  tolerance_min integer NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sleep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  date text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sleep_sessions_user_idx ON sleep_sessions(user_id, date);
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS achievements_user_key_unique ON achievements(user_id, key);
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  target_days integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS challenges_unique_start ON challenges(user_id, type, start_date);
`;

let inflight: Promise<void> | null = null;

/** Runs the bootstrap once per process; safe to call on every request. */
export function ensureSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return Promise.resolve(); // 503 handled upstream
  if (!inflight) {
    inflight = pool
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((e) => {
        inflight = null; // allow retry on next request
        throw e;
      });
  }
  return inflight;
}
