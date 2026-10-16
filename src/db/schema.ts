import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramId: text("telegram_id").unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const preferences = pgTable("preferences", {
  profileId: uuid("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  ageGroup: text("age_group"),
  lifeStage: text("life_stage"),
  lifeStageOther: text("life_stage_other"),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  interestsOther: text("interests_other"),
  objectives: jsonb("objectives").$type<string[]>().notNull().default([]),
  objectivesOther: text("objectives_other"),
  wakeTime: text("wake_time"),
  bedtime: text("bedtime"),
  commitments: text("commitments"),
  personalTime: text("personal_time"),
  weekendVaries: boolean("weekend_varies"),
  planningStyle: text("planning_style"),
  difficulties: jsonb("difficulties").$type<string[]>().notNull().default([]),
  phoneBeforeBed: text("phone_before_bed"),
  sleepTargetMinutes: integer("sleep_target_minutes"),
  hiddenSections: jsonb("hidden_sections").$type<string[]>().notNull().default([]),
  theme: text("theme").notNull().default("system"),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  language: text("language").notNull().default("uz"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("personal"),
  targetDate: date("target_date"),
  status: text("status").notNull().default("active"), // active, archived, completed, paused
  metricTarget: integer("metric_target"),
  metricUnit: text("metric_unit"),
  metricProgress: integer("metric_progress").notNull().default(0),
  source: text("source").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  dueDate: date("due_date"),
  priority: text("priority").notNull().default("normal"), // low, normal, high
  durationMinutes: integer("duration_minutes"),
  status: text("status").notNull().default("todo"), // todo, done
  source: text("source").notNull().default("user"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("daily"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habitLogs = pgTable("habit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  habitId: uuid("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sleepSessions = pgTable("sleep_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  durationMinutes: integer("duration_minutes"),
  manual: boolean("manual").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  energy: text("energy"), // energized, okay, tired
  activityMinutes: integer("activity_minutes"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assistantMessages = pgTable("assistant_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  origin: text("origin").notNull().default("rules"), // ai, rules
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

import { type InferSelectModel } from "drizzle-orm";
export type ProfileRow = InferSelectModel<typeof profiles>;
export type PreferencesRow = InferSelectModel<typeof preferences>;
export type GoalRow = InferSelectModel<typeof goals>;
export type TaskRow = InferSelectModel<typeof tasks>;
export type HabitRow = InferSelectModel<typeof habits>;
export type HabitLogRow = InferSelectModel<typeof habitLogs>;
export type SleepSessionRow = InferSelectModel<typeof sleepSessions>;
export type CheckinRow = InferSelectModel<typeof checkins>;
export type AssistantMessageRow = InferSelectModel<typeof assistantMessages>;
