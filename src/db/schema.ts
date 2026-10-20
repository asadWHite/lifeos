import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Auth + profile                                                      */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleSub: text("google_sub").unique(),
  name: text("name").notNull().default(""),
  nickname: text("nickname"),
  image: text("image"),
  dob: text("dob"),
  timezone: text("timezone").notNull().default("Asia/Tashkent"),
  theme: text("theme").notNull().default("dark"),
  // Onboarding + personalization answers (validated with zod on write)
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  lifeSituation: text("life_situation"),
  responsibilities: text("responsibilities").array().notNull().default(sql`ARRAY[]::text[]`),
  interests: text("interests").array().notNull().default(sql`ARRAY[]::text[]`),
  goalNotes: text("goal_notes").notNull().default(""),
  schedule: jsonb("schedule")
    .$type<{ wakeTime?: string; bedTime?: string; commitment?: string; focusTime?: string }>()
    .notNull()
    .default({}),
  phoneHabits: jsonb("phone_habits")
    .$type<{ beforeBed?: string; afterWake?: string }>()
    .notNull()
    .default({}),
  habitFocus: text("habit_focus").array().notNull().default(sql`ARRAY[]::text[]`),
  reminderStyle: text("reminder_style").notNull().default("gentle"),
  planningStyle: text("planning_style").notNull().default("balanced"),
  remindersEnabled: boolean("reminders_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    token: text("token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Tasks + goals                                                       */
/* ------------------------------------------------------------------ */

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    date: text("date").notNull(), // YYYY-MM-DD in the user's timezone
    startTime: text("start_time"), // HH:MM or null (anytime task)
    endTime: text("end_time"),
    priority: text("priority").notNull().default("medium"), // low | medium | high
    category: text("category").notNull().default("personal"),
    status: text("status").notNull().default("pending"), // pending | completed
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_user_date_idx").on(t.userId, t.date),
    index("tasks_user_status_idx").on(t.userId, t.status),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("personal"),
    targetDate: text("target_date"),
    targetValue: integer("target_value"),
    currentValue: integer("current_value").notNull().default(0),
    unit: text("unit").notNull().default(""),
    status: text("status").notNull().default("active"), // active | completed
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("goals_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    days: integer("days").array().notNull().default(sql`ARRAY[0,1,2,3,4,5,6]::int[]`), // weekdays 0=Sun
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("habits_user_idx").on(t.userId)],
);

export const habitCompletions = pgTable(
  "habit_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD in user tz
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("habit_completions_unique_day").on(t.habitId, t.date),
    index("habit_completions_user_idx").on(t.userId, t.date),
  ],
);

/* ------------------------------------------------------------------ */
/* Sleep                                                               */
/* ------------------------------------------------------------------ */

export const sleepSchedules = pgTable("sleep_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bedtime: text("bedtime").notNull().default("23:00"),
  wakeTime: text("wake_time").notNull().default("07:00"),
  toleranceMin: integer("tolerance_min").notNull().default(15),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const sleepSessions = pgTable(
  "sleep_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    date: text("date").notNull(), // local date of the wake-up (or start while active)
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("sleep_sessions_user_idx").on(t.userId, t.date)],
);

/* ------------------------------------------------------------------ */
/* Achievements + challenges                                           */
/* ------------------------------------------------------------------ */

export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("achievements_user_key_unique").on(t.userId, t.key)],
);

export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // ten_day | monthly
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    targetDays: integer("target_days").notNull(),
    status: text("status").notNull().default("active"), // active | completed | failed
    meta: jsonb("meta").$type<{ month?: number; year?: number }>().notNull().default({}),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("challenges_unique_start").on(t.userId, t.type, t.startDate)],
);

export type User = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type SleepSchedule = typeof sleepSchedules.$inferSelect;
export type SleepSession = typeof sleepSessions.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
