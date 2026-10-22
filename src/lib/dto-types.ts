/* Pure type definitions for DTOs — no runtime imports from @/db/schema.
 * Safe to import from "use client" components without pulling in pg/dns/tls.
 * The converter functions live in dto.ts (server-only). */

export interface TaskDTO {
  id: string; userId: string; title: string; description: string;
  date: string; startTime: string | null; endTime: string | null;
  priority: string; category: string; status: string;
  completedAt: string | null; goalId: string | null;
  createdAt: string; updatedAt: string;
}

export interface HabitDTO {
  id: string; userId: string; name: string; description: string;
  days: number[]; archived: boolean; createdAt: string;
}

export interface GoalDTO {
  id: string; userId: string; title: string; description: string;
  category: string; targetDate: string | null;
  targetValue: number | null; currentValue: number; unit: string;
  status: string; completedAt: string | null; createdAt: string;
}

export interface SleepSessionDTO {
  id: string; userId: string; startedAt: string;
  endedAt: string | null; date: string; note: string; createdAt: string;
}

export interface SleepScheduleDTO {
  id: string; userId: string; bedtime: string; wakeTime: string;
  toleranceMin: number; updatedAt: string;
}

export interface ChallengeDTO {
  id: string; userId: string; type: string; startDate: string;
  endDate: string; targetDays: number; status: string;
  meta: { month?: number; year?: number };
  completedAt: string | null; createdAt: string;
}
