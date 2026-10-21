import { Pool } from "pg";
import { jsonError, jsonOk } from "@/lib/api-helpers";

/* One-time setup endpoint: tests a Postgres connection, bootstraps the
 * schema, sets DATABASE_URL in Vercel, and triggers a redeploy.
 * All in one pass so the user never leaves the browser.
 *
 * Security notes:
 * - DATABASE_URL is NEVER logged or returned in responses.
 * - The Vercel token is server-only (process.env, never in client bundle).
 * - The bootstrap SQL is idempotent CREATE TABLE IF NOT EXISTS.
 * - After setup this endpoint can be disabled or protected. */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VCP_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

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
  title text NOT NULL, description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'personal', target_date text,
  target_value integer, current_value integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active',
  completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goals_user_idx ON goals(user_id);
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL, description text NOT NULL DEFAULT '',
  date text NOT NULL, start_time text, end_time text,
  priority text NOT NULL DEFAULT 'medium', category text NOT NULL DEFAULT 'personal',
  status text NOT NULL DEFAULT 'pending', completed_at timestamptz,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_user_date_idx ON tasks(user_id, date);
CREATE INDEX IF NOT EXISTS tasks_user_status_idx ON tasks(user_id, status);
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL, description text NOT NULL DEFAULT '',
  days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habits_user_idx ON habits(user_id);
CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS habit_completions_unique_day ON habit_completions(habit_id, date);
CREATE INDEX IF NOT EXISTS habit_completions_user_idx ON habit_completions(user_id, date);
CREATE TABLE IF NOT EXISTS sleep_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bedtime text NOT NULL DEFAULT '23:00', wake_time text NOT NULL DEFAULT '07:00',
  tolerance_min integer NOT NULL DEFAULT 15, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sleep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL, ended_at timestamptz,
  date text NOT NULL, note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sleep_sessions_user_idx ON sleep_sessions(user_id, date);
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL, unlocked_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS achievements_user_key_unique ON achievements(user_id, key);
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL, start_date text NOT NULL, end_date text NOT NULL,
  target_days integer NOT NULL, status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS challenges_unique_start ON challenges(user_id, type, start_date);
`;

function needsTls(connStr: string): boolean {
  try {
    const h = new URL(connStr).hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;
    if (/sslmode=disable/.test(connStr)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: { action?: string; databaseUrl?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid request.");
  }
  const action = body?.action;
  const databaseUrl = typeof body?.databaseUrl === "string" ? body.databaseUrl.trim() : "";

  if (!databaseUrl || (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://"))) {
    return jsonError(400, "Invalid connection string.");
  }

  // ── TEST ──────────────────────────────────────────────────
  if (action === "test") {
    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 8000,
      max: 1,
      ...(needsTls(databaseUrl) ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    try {
      const { rows } = await pool.query(
        `SELECT count(*) as n FROM information_schema.tables WHERE table_schema = 'public'`,
      );
      const tables = Number(rows[0]?.n ?? 0);
      return jsonOk({ tables });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      // Sanitize: don't return the full connection string if it leaks into the error
      const safe = msg.replace(/postgresql?:\/\/[^\s]+/g, "postgresql://***");
      return jsonError(502, `Connection failed: ${safe}`);
    } finally {
      await pool.end().catch(() => {});
    }
  }

  // ── BOOTSTRAP ─────────────────────────────────────────────
  if (action === "bootstrap") {
    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 10000,
      max: 1,
      ...(needsTls(databaseUrl) ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    try {
      await pool.query(SCHEMA_SQL);
      const { rows } = await pool.query(
        `SELECT count(*) as n FROM information_schema.tables WHERE table_schema = 'public'`,
      );
      return jsonOk({ tables: Number(rows[0]?.n ?? 0) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown";
      return jsonError(502, msg.replace(/postgresql?:\/\/[^\s]+/g, "postgresql://***"));
    } finally {
      await pool.end().catch(() => {});
    }
  }

  // ── DEPLOY (set Vercel env + redeploy) ────────────────────
  if (action === "deploy") {
    if (!VERCEL_TOKEN) {
      return jsonError(503, "VERCEL_TOKEN is not configured on this deployment. Set DATABASE_URL manually in Vercel → Settings → Environment Variables.");
    }

    const projectId = VERCEL_PROJECT_ID || "prj_2GsjZbQxf9DeINL7wUXBMnikKcGG";
    const headers = { Authorization: `Bearer ${VERCEL_TOKEN}`, "content-type": "application/json" };

    // Check if DATABASE_URL already exists
    const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=false`, { headers });
    const listData = (await listRes.json()) as { envs?: { id: string; key: string }[] };
    const existing = listData.envs?.find((e) => e.key === "DATABASE_URL");

    let envOk = false;
    if (existing) {
      // Update
      const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ value: databaseUrl, type: "sensitive", target: ["production", "preview", "development"] }),
      });
      envOk = res.ok;
    } else {
      // Create
      const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
        method: "POST",
        headers,
        body: JSON.stringify({ key: "DATABASE_URL", value: databaseUrl, type: "sensitive", target: ["production", "preview", "development"] }),
      });
      envOk = res.ok;
    }
    if (!envOk) {
      return jsonError(502, "Could not set DATABASE_URL in Vercel. Check the Vercel token permissions.");
    }

    // Trigger redeploy
    let redeployed = false;
    try {
      const depsRes = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1`, { headers });
      const deps = (await depsRes.json()) as { deployments?: { uid: string }[] };
      const latest = deps.deployments?.[0];
      if (latest) {
        // Use git-source redeploy
        const projRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, { headers });
        const proj = (await projRes.json()) as { link?: { repoId?: number; org?: string } };
        if (proj.link?.repoId) {
          const rdRes = await fetch("https://api.vercel.com/v13/deployments", {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: "lifeos",
              project: projectId,
              target: "production",
              gitSource: { type: "github", repoId: proj.link.repoId, ref: "main" },
            }),
          });
          redeployed = rdRes.ok;
        }
      }
    } catch {
      // Non-critical — user can redeploy manually
    }

    return jsonOk({ saved: true, redeployed });
  }

  return jsonError(400, "Unknown action.");
}
