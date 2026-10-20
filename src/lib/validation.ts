import { z } from "zod";
import { isValidDateString, isValidTimeString, parseTimeToMin } from "@/lib/dates";

/* Shared constants */
export const PRIORITIES = ["low", "medium", "high"] as const;
export const CATEGORIES = [
  "personal", "work", "study", "health", "fitness", "family", "creative", "social", "errands",
] as const;
export const LIFE_SITUATIONS = [
  "school_student", "university_student", "working_adult", "self_employed", "multiple", "other",
] as const;
export const RESPONSIBILITY_OPTIONS = [
  "school", "university", "work", "study", "family", "fitness", "projects", "other",
] as const;
export const INTEREST_OPTIONS = [
  "education", "languages", "health", "sleep", "productivity", "growth", "work", "creative", "social", "habits",
] as const;
export const HABIT_FOCUS_OPTIONS = [
  "sleep", "study", "exercise", "reading", "planning", "less_phone", "projects",
] as const;
export const REMINDER_STYLES = ["gentle", "firm", "minimal"] as const;
export const PLANNING_STYLES = ["structured", "balanced", "flexible"] as const;
export const THEMES = ["dark", "light"] as const;

const dateStr = z.string().refine(isValidDateString, "Invalid date");
const timeStr = z.string().refine(isValidTimeString, "Invalid time (HH:MM)");
const optionalTime = z.union([timeStr, z.literal(""), z.null()]).transform((v) => (v ? v : null));

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const signinSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const onboardingPatchSchema = z.object({
  step: z.number().int().min(0).max(20).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  nickname: z.string().trim().max(40).nullable().optional(),
  dob: z.union([dateStr, z.literal(""), z.null()]).optional(),
  timezone: z.string().max(64).optional(),
  lifeSituation: z.enum(LIFE_SITUATIONS).nullable().optional(),
  responsibilities: z.array(z.enum(RESPONSIBILITY_OPTIONS)).max(8).optional(),
  interests: z.array(z.enum(INTEREST_OPTIONS)).max(12).optional(),
  goalNotes: z.string().trim().max(500).optional(),
  wakeTime: optionalTime.optional(),
  bedTime: optionalTime.optional(),
  commitment: z.string().trim().max(120).optional(),
  focusTime: z.string().trim().max(120).optional(),
  phoneBeforeBed: z.string().trim().max(60).nullable().optional(),
  phoneAfterWake: z.string().trim().max(60).nullable().optional(),
  habitFocus: z.array(z.enum(HABIT_FOCUS_OPTIONS)).max(8).optional(),
  reminderStyle: z.enum(REMINDER_STYLES).optional(),
  planningStyle: z.enum(PLANNING_STYLES).optional(),
  complete: z.boolean().optional(),
});

export const profilePatchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80).optional(),
  nickname: z.string().trim().max(40).nullable().optional(),
  dob: z.union([dateStr, z.literal(""), z.null()]).transform((v) => (v ? v : null)).optional(),
  timezone: z.string().max(64).optional(),
  theme: z.enum(THEMES).optional(),
  remindersEnabled: z.boolean().optional(),
  reminderStyle: z.enum(REMINDER_STYLES).optional(),
  planningStyle: z.enum(PLANNING_STYLES).optional(),
  lifeSituation: z.enum(LIFE_SITUATIONS).nullable().optional(),
  interests: z.array(z.enum(INTEREST_OPTIONS)).max(12).optional(),
  responsibilities: z.array(z.enum(RESPONSIBILITY_OPTIONS)).max(8).optional(),
  habitFocus: z.array(z.enum(HABIT_FOCUS_OPTIONS)).max(8).optional(),
  phoneBeforeBed: z.string().trim().max(60).nullable().optional(),
  phoneAfterWake: z.string().trim().max(60).nullable().optional(),
  wakeTime: optionalTime.optional(),
  bedTime: optionalTime.optional(),
});

const timeOrder = (data: { startTime?: string | null; endTime?: string | null }, ctx: z.RefinementCtx) => {
  if (data.startTime && data.endTime) {
    const s = parseTimeToMin(data.startTime);
    const e = parseTimeToMin(data.endTime);
    if (s != null && e != null && e <= s) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after the start time" });
    }
  }
};

export const taskCreateSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(140),
    description: z.string().trim().max(2000).optional().default(""),
    date: dateStr,
    startTime: optionalTime.optional(),
    endTime: optionalTime.optional(),
    priority: z.enum(PRIORITIES).optional().default("medium"),
    category: z.string().trim().max(30).optional().default("personal"),
    goalId: z.string().uuid().nullable().optional(),
  })
  .superRefine(timeOrder);

export const taskPatchSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(140).optional(),
    description: z.string().trim().max(2000).optional(),
    date: dateStr.optional(),
    startTime: optionalTime.optional(),
    endTime: optionalTime.optional(),
    priority: z.enum(PRIORITIES).optional(),
    category: z.string().trim().max(30).optional(),
    goalId: z.string().uuid().nullable().optional(),
    status: z.enum(["pending", "completed"]).optional(),
  })
  .superRefine(timeOrder);

export const habitCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(500).optional().default(""),
  days: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day").max(7),
});

export const habitPatchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80).optional(),
  description: z.string().trim().max(500).optional(),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  archived: z.boolean().optional(),
});

export const habitCompleteSchema = z.object({
  date: dateStr,
  done: z.boolean(),
});

export const goalCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(1000).optional().default(""),
  category: z.string().trim().max(30).optional().default("personal"),
  targetDate: z.union([dateStr, z.literal(""), z.null()]).transform((v) => (v ? v : null)).optional(),
  targetValue: z.number().int().positive().max(1_000_000).nullable().optional(),
  unit: z.string().trim().max(20).optional().default(""),
});

export const goalPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(30).optional(),
  targetDate: z.union([dateStr, z.literal(""), z.null()]).transform((v) => (v ? v : null)).optional(),
  targetValue: z.number().int().positive().max(1_000_000).nullable().optional(),
  currentValue: z.number().int().min(0).max(1_000_000).optional(),
  unit: z.string().trim().max(20).optional(),
  action: z.enum(["complete", "reopen"]).optional(),
});

export const sleepScheduleSchema = z.object({
  bedtime: timeStr,
  wakeTime: timeStr,
  toleranceMin: z.number().int().min(0, "Tolerance cannot be negative").max(120, "Tolerance too large"),
});

export const sleepSessionPatchSchema = z
  .object({
    startedAt: z.string().datetime({ offset: true }).optional(),
    endedAt: z.string().datetime({ offset: true }).nullable().optional(),
    note: z.string().trim().max(500).optional(),
    endNow: z.boolean().optional(),
  })
  .refine((d) => !(d.startedAt && d.endedAt) || new Date(d.endedAt!) > new Date(d.startedAt!), {
    message: "Wake time must be after bedtime",
    path: ["endedAt"],
  });

export const sleepLogSchema = z
  .object({
    startedAt: z.string().datetime({ offset: true }),
    endedAt: z.string().datetime({ offset: true }).nullable().optional(),
    note: z.string().trim().max(500).optional().default(""),
  })
  .refine((d) => !d.endedAt || new Date(d.endedAt) > new Date(d.startedAt), {
    message: "Wake time must be after bedtime",
    path: ["endedAt"],
  });

export const challengeCreateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ten_day") }),
  z.object({
    type: z.literal("monthly"),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }),
]);
