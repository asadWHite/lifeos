/**
 * Zod schemas for every external input boundary:
 * server actions, the assistant API, and settings writes.
 */

import { z } from "zod";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .nullable();

export const timeHHMM = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time")
  .nullable();

export const prioritySchema = z.enum(["low", "normal", "high"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  notes: z.string().trim().max(1000).nullish(),
  dueDate: isoDate.optional(),
  priority: prioritySchema.default("normal"),
  durationMinutes: z.number().int().min(5).max(24 * 60).nullish(),
  goalId: z.string().uuid().nullish(),
});

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  notes: z.string().trim().max(1000).nullish(),
  dueDate: isoDate.optional(),
  priority: prioritySchema.optional(),
  durationMinutes: z.number().int().min(5).max(24 * 60).nullish(),
  goalId: z.string().uuid().nullish(),
});

export const goalSchema = z.object({
  title: z.string().trim().min(1, "A goal needs a name").max(120),
  description: z.string().trim().max(500).nullish(),
  category: z
    .enum(["learning", "career", "health", "personal", "finance", "creative", "other"])
    .default("personal"),
  targetDate: isoDate.optional(),
  metricTarget: z.number().int().min(1).max(100_000).nullish(),
  metricUnit: z.string().trim().max(24).nullish(),
});

export const sleepCorrectionSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.string().min(10),
  endedAt: z.string().min(10),
});

export const checkinSchema = z.object({
  energy: z.enum(["energized", "okay", "tired"]).nullish(),
  activityMinutes: z.number().int().min(0).max(600).nullish(),
  note: z.string().trim().max(240).nullish(),
});

export const createProfileSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name").max(40),
  timezone: z.string().max(64).default("UTC"),
});

export const preferencesSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  timezone: z.string().max(64).optional(),
  sleepTargetMinutes: z.number().int().min(240).max(720).nullish(),
  wakeTime: timeHHMM.optional(),
  bedtime: timeHHMM.optional(),
  planningStyle: z.enum(["full_plan", "together", "independent"]).nullish(),
  phoneBeforeBed: z.enum(["rarely", "sometimes", "often", "prefer_not"]).nullish(),
  hiddenSections: z.array(z.string()).max(12).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export const onboardingPayloadSchema = z.object({
  step: z.number().int().min(0).max(7),
  values: z.object({
    ageGroup: z
      .enum(["u13", "a13_17", "a18_24", "a25_34", "a35_49", "a50_64", "a65p"])
      .nullish(),
    lifeStage: z
      .enum(["school", "university", "employed", "entrepreneur", "job_seeking", "home_family", "retired", "other"])
      .nullish(),
    lifeStageOther: z.string().trim().max(120).nullish(),
    interests: z.array(z.string()).max(12).optional(),
    interestsOther: z.string().trim().max(120).nullish(),
    objectives: z.array(z.string()).max(12).optional(),
    objectivesOther: z.string().trim().max(120).nullish(),
    wakeTime: timeHHMM.optional(),
    bedtime: timeHHMM.optional(),
    commitments: z.enum(["school", "work", "mixed", "flexible"]).nullish(),
    personalTime: z.enum(["morning", "afternoon", "evening", "varies"]).nullish(),
    weekendVaries: z.boolean().nullish(),
    planningStyle: z.enum(["full_plan", "together", "independent"]).nullish(),
    difficulties: z.array(z.string()).max(8).optional(),
    phoneBeforeBed: z.enum(["rarely", "sometimes", "often", "prefer_not"]).nullish(),
  }),
});

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export const assistantProposalSchema = z.object({
  type: z.literal("createTask"),
  title: z.string().trim().min(1).max(160),
  priority: prioritySchema.default("normal"),
  durationMinutes: z.number().int().min(5).max(24 * 60).nullish(),
  due: z.enum(["today", "tomorrow"]).default("today"),
});
