import "server-only";

const globalSchema = globalThis as typeof globalThis & {
  __lifeosSchemaReady?: boolean;
  __lifeosSchemaChecking?: boolean;
};

/**
 * Call /api/health once at startup to auto-create tables.
 * Safe to call multiple times — only runs once per cold start.
 */
export async function ensureDatabase(): Promise<void> {
  if (globalSchema.__lifeosSchemaReady) return;
  if (globalSchema.__lifeosSchemaChecking) return;

  globalSchema.__lifeosSchemaChecking = true;

  try {
    // Dynamically import to avoid circular deps
    const { db } = await import("@/db");
    const { sql } = await import("drizzle-orm");

    // Quick connection test
    await db.execute(sql`SELECT 1`);

    // Create tables if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        onboarding_completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS preferences (
        profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
        age_group TEXT, life_stage TEXT, life_stage_other TEXT,
        interests JSONB NOT NULL DEFAULT '[]', interests_other TEXT,
        objectives JSONB NOT NULL DEFAULT '[]', objectives_other TEXT,
        wake_time TEXT, bedtime TEXT, commitments TEXT, personal_time TEXT,
        weekend_varies BOOLEAN, planning_style TEXT,
        difficulties JSONB NOT NULL DEFAULT '[]', phone_before_bed TEXT,
        sleep_target_minutes INTEGER, hidden_sections JSONB NOT NULL DEFAULT '[]',
        theme TEXT NOT NULL DEFAULT 'system', onboarding_step INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS goals (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL, description TEXT,
        category TEXT NOT NULL DEFAULT 'personal', target_date DATE,
        status TEXT NOT NULL DEFAULT 'active',
        metric_target INTEGER, metric_unit TEXT, metric_progress INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'user', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
        title TEXT NOT NULL, notes TEXT, due_date DATE,
        priority TEXT NOT NULL DEFAULT 'normal', duration_minutes INTEGER,
        status TEXT NOT NULL DEFAULT 'todo', source TEXT NOT NULL DEFAULT 'user',
        completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS sleep_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ,
        duration_minutes INTEGER, manual BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS daily_checkins (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        day DATE NOT NULL, energy TEXT, activity_minutes INTEGER, note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS daily_checkins_profile_day ON daily_checkins (profile_id, day);
      CREATE TABLE IF NOT EXISTS assistant_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        role TEXT NOT NULL, content TEXT NOT NULL,
        origin TEXT NOT NULL DEFAULT 'rules', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    globalSchema.__lifeosSchemaReady = true;
    console.log("[lifeos] Database tables ready");
  } catch (error) {
    console.error("[lifeos] Database setup failed:", error);
  } finally {
    globalSchema.__lifeosSchemaChecking = false;
  }
}
