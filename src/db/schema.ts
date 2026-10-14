import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

/**
 * LIFEOS data model.
 *
 * Designed so a future Flutter client can consume the same tables/contracts.
 * All rows are owned by a `profile`. In this phase, profiles are local
 * device profiles (no password auth). If Supabase credentials are later
 * configured, `profiles` maps 1:1 onto auth users and every table is ready
 * for row-level-security scoping by `profile_id`.
 */

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  onboardingCompleted: boolean("onboarding_completed")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const preferences = pgTable("preferences", {
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" })
    .primaryKey(),
  // Onboarding answers (explicit, user-visible personalization data)
  ageGroup: text("age_group"),
  lifeStage: text("life_stage"),
  lifeStageOther: text("life_stage_other"),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  interestsOther: text("interests_other"),
  objectives: jsonb("objectives").$type<string[]>().notNull().default([]),
  objectivesOther: text("objectives_other"),
  wakeTime: text("wake_time"), // "HH:MM" (intent, not measured)
  bedtime: text("bedtime"),
  commitments: text("commitments"),
  personalTime: text("personal_time"),
  weekendVaries: boolean("weekend_varies"),
  planningStyle: text("planning_style"), // full_plan | together | independent
  difficulties: jsonb("difficulties").$type<string[]>().notNull().default([]),
  phoneBeforeBed: text("phone_before_bed"), // rarely | sometimes | often | prefer_not
  // Configured (editable) settings
  sleepTargetMinutes: integer("sleep_target_minutes"),
  hiddenSections: jsonb("hidden_sections")
    .$type<string[]>()
    .notNull()
    .default([]),
  theme: text("theme").notNull().default("system"),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("personal"),
  targetDate: date("target_date"),
  status: text("status").notNull().default("active"), // active | archived | completed
  // Optional measurable target (e.g. 20 sessions, 30 days, 12 chapters)
  metricTarget: integer("metric_target"),
  metricUnit: text("metric_unit"),
  metricProgress: integer("metric_progress").notNull().default(0),
  source: text("source").notNull().default("user"), // user | lifeos
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  dueDate: date("due_date"),
  priority: text("priority").notNull().default("normal"), // low | normal | high
  durationMinutes: integer("duration_minutes"),
  status: text("status").notNull().default("todo"), // todo | done
  source: text("source").notNull().default("user"), // user | lifeos | assistant
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sleepSessions = pgTable("sleep_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"), // null while session is active
  manual: boolean("manual").notNull().default(false), // true if times were corrected
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    energy: text("energy"), // energized | okay | tired
    activityMinutes: integer("activity_minutes"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("daily_checkins_profile_day").on(t.profileId, t.day)],
);

export const assistantMessages = pgTable("assistant_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  origin: text("origin").notNull().default("rules"), // ai | rules — honesty about provenance
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProfileRow = InferSelectModel<typeof profiles>;
export type PreferencesRow = InferSelectModel<typeof preferences>;
export type TaskRow = InferSelectModel<typeof tasks>;
export type GoalRow = InferSelectModel<typeof goals>;
export type SleepSessionRow = InferSelectModel<typeof sleepSessions>;
export type CheckinRow = InferSelectModel<typeof dailyCheckins>;
export type AssistantMessageRow = InferSelectModel<typeof assistantMessages>;
