import { db } from "@/db";
import { sql } from "drizzle-orm";
import {
  classifyDatabaseIssue,
  getDatabaseStatus,
} from "@/server/runtime-status";

export const dynamic = "force-dynamic";

/**
 * Auto-create all LIFEOS tables if they don't exist yet.
 * This removes the need to manually run `drizzle-kit push`.
 */
async function ensureSchema() {
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
      age_group TEXT,
      life_stage TEXT,
      life_stage_other TEXT,
      interests JSONB NOT NULL DEFAULT '[]',
      interests_other TEXT,
      objectives JSONB NOT NULL DEFAULT '[]',
      objectives_other TEXT,
      wake_time TEXT,
      bedtime TEXT,
      commitments TEXT,
      personal_time TEXT,
      weekend_varies BOOLEAN,
      planning_style TEXT,
      difficulties JSONB NOT NULL DEFAULT '[]',
      phone_before_bed TEXT,
      sleep_target_minutes INTEGER,
      hidden_sections JSONB NOT NULL DEFAULT '[]',
      theme TEXT NOT NULL DEFAULT 'system',
      onboarding_step INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS goals (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'personal',
      target_date DATE,
      status TEXT NOT NULL DEFAULT 'active',
      metric_target INTEGER,
      metric_unit TEXT,
      metric_progress INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      notes TEXT,
      due_date DATE,
      priority TEXT NOT NULL DEFAULT 'normal',
      duration_minutes INTEGER,
      status TEXT NOT NULL DEFAULT 'todo',
      source TEXT NOT NULL DEFAULT 'user',
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sleep_sessions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ,
      duration_minutes INTEGER,
      manual BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS daily_checkins (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      energy TEXT,
      activity_minutes INTEGER,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS daily_checkins_profile_day
      ON daily_checkins (profile_id, day);

    CREATE TABLE IF NOT EXISTS assistant_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'rules',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

const globalSchema = globalThis as typeof globalThis & {
  __lifeosSchemaReady?: boolean;
};

export async function GET() {
  const envStatus = getDatabaseStatus();

  try {
    // Test connection
    await db.execute(sql`SELECT 1`);

    // Auto-create tables on first successful connection
    let schemaReady = globalSchema.__lifeosSchemaReady === true;
    if (!schemaReady) {
      try {
        await ensureSchema();
        globalSchema.__lifeosSchemaReady = true;
        schemaReady = true;
      } catch (schemaError) {
        console.error("[lifeos] auto-schema failed:", schemaError);
      }
    }

    return Response.json({
      ok: true,
      connected: true,
      schemaReady,
      env: envStatus,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        connected: false,
        schemaReady: false,
        env: envStatus,
        issue: classifyDatabaseIssue(error),
      },
      { status: 500 },
    );
  }
}
