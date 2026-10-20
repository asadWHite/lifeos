import type { Challenge, Goal, Habit, SleepSchedule, SleepSession, Task } from "@/db/schema";

/* Serializable shapes passed from server components to client comps. */

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const isoReq = (d: Date) => d.toISOString();

export type TaskDTO = Omit<Task, "createdAt" | "updatedAt" | "completedAt"> & {
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
export const toTaskDTO = (t: Task): TaskDTO => ({
  ...t,
  createdAt: isoReq(t.createdAt),
  updatedAt: isoReq(t.updatedAt),
  completedAt: iso(t.completedAt),
});

export type HabitDTO = Omit<Habit, "createdAt"> & { createdAt: string };
export const toHabitDTO = (h: Habit): HabitDTO => ({ ...h, createdAt: isoReq(h.createdAt) });

export type GoalDTO = Omit<Goal, "createdAt" | "completedAt"> & { createdAt: string; completedAt: string | null };
export const toGoalDTO = (g: Goal): GoalDTO => ({ ...g, createdAt: isoReq(g.createdAt), completedAt: iso(g.completedAt) });

export type SleepSessionDTO = Omit<SleepSession, "startedAt" | "endedAt" | "createdAt"> & {
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};
export const toSleepSessionDTO = (s: SleepSession): SleepSessionDTO => ({
  ...s,
  startedAt: isoReq(s.startedAt),
  endedAt: iso(s.endedAt),
  createdAt: isoReq(s.createdAt),
});

export type SleepScheduleDTO = Omit<SleepSchedule, "updatedAt"> & { updatedAt: string };
export const toSleepScheduleDTO = (s: SleepSchedule): SleepScheduleDTO => ({ ...s, updatedAt: isoReq(s.updatedAt) });

export type ChallengeDTO = Omit<Challenge, "createdAt" | "completedAt"> & { createdAt: string; completedAt: string | null };
export const toChallengeDTO = (c: Challenge): ChallengeDTO => ({
  ...c,
  createdAt: isoReq(c.createdAt),
  completedAt: iso(c.completedAt),
});
