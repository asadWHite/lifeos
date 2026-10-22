/* Static, realistic demo data for Preview Mode.
 * All IDs are deterministic UUIDs so the UI renders identically.
 * Nothing here is real user data — it exists only for design inspection.
 *
 * IMPORTANT: This file must NOT import from @/db/schema or @/lib/dto
 * because those transitively pull in Node-only pg modules. We define
 * the exact same shapes inline. */

import type { HabitView } from "@/components/plan-module";
import type { AchievementView, ChallengeView } from "@/components/progress-module";
import type { BarDatum } from "@/components/charts";
import { addDays, todayInTz, nowMinutesInTz, weekdayOf, formatDuration, timeLabel } from "@/lib/dates";
import { ACHIEVEMENTS } from "@/lib/achievement-catalog";
import type { SleepStatus } from "@/lib/sleep";

const TZ = "Asia/Tashkent";
const TODAY = todayInTz(TZ);
const NOW_MIN = nowMinutesInTz(TZ);
const uuid = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, "0")}`;
const iso = () => new Date().toISOString();

/* ─── Inline types matching the DTO shapes ──────── */
interface TaskDTO {
  id: string; userId: string; title: string; description: string;
  date: string; startTime: string | null; endTime: string | null;
  priority: string; category: string; status: string;
  completedAt: string | null; goalId: string | null;
  createdAt: string; updatedAt: string;
}
interface HabitDTO {
  id: string; userId: string; name: string; description: string;
  days: number[]; archived: boolean; createdAt: string;
}
interface GoalDTO {
  id: string; userId: string; title: string; description: string;
  category: string; targetDate: string | null;
  targetValue: number | null; currentValue: number; unit: string;
  status: string; completedAt: string | null; createdAt: string;
}
interface SleepScheduleDTO {
  id: string; userId: string; bedtime: string; wakeTime: string;
  toleranceMin: number; updatedAt: string;
}
interface SleepRow {
  id: string; date: string; startedAt: string;
  endedAt: string | null; note: string; durationMin: number | null;
  status: SleepStatus; startLabel: string; endLabel: string | null;
}

/* ─── Tasks ──────────────────────────────────────── */
export const DEMO_TASKS: TaskDTO[] = [
  { id: uuid(1), userId: uuid(0), title: "Morning workout", description: "30 min HIIT + stretching", date: TODAY, startTime: "06:30", endTime: "07:00", priority: "high", category: "fitness", status: "completed", completedAt: iso(), goalId: null, createdAt: iso(), updatedAt: iso() },
  { id: uuid(2), userId: uuid(0), title: "Math revision — Chapter 4", description: "Focus on integral calculus problems", date: TODAY, startTime: "09:00", endTime: "10:30", priority: "high", category: "study", status: "completed", completedAt: iso(), goalId: null, createdAt: iso(), updatedAt: iso() },
  { id: uuid(3), userId: uuid(0), title: "Read IELTS practice set", description: "", date: TODAY, startTime: "11:00", endTime: "12:00", priority: "medium", category: "study", status: "pending", completedAt: null, goalId: uuid(20), createdAt: iso(), updatedAt: iso() },
  { id: uuid(4), userId: uuid(0), title: "Lunch break & walk", description: "", date: TODAY, startTime: "13:00", endTime: "13:45", priority: "low", category: "health", status: "pending", completedAt: null, goalId: null, createdAt: iso(), updatedAt: iso() },
  { id: uuid(5), userId: uuid(0), title: "Work on portfolio project", description: "Finish the landing page responsive layout", date: TODAY, startTime: "15:00", endTime: "17:00", priority: "high", category: "creative", status: "pending", completedAt: null, goalId: uuid(21), createdAt: iso(), updatedAt: iso() },
  { id: uuid(6), userId: uuid(0), title: "Call family", description: "", date: TODAY, startTime: "19:00", endTime: null, priority: "medium", category: "family", status: "pending", completedAt: null, goalId: null, createdAt: iso(), updatedAt: iso() },
  { id: uuid(7), userId: uuid(0), title: "Review tomorrow's plan", description: "", date: TODAY, startTime: null, endTime: null, priority: "low", category: "personal", status: "pending", completedAt: null, goalId: null, createdAt: iso(), updatedAt: iso() },
  { id: uuid(8), userId: uuid(0), title: "University lecture", description: "Advanced algorithms", date: addDays(TODAY, 1), startTime: "08:00", endTime: "10:00", priority: "high", category: "study", status: "pending", completedAt: null, goalId: null, createdAt: iso(), updatedAt: iso() },
  { id: uuid(9), userId: uuid(0), title: "Gym — leg day", description: "", date: addDays(TODAY, 1), startTime: "18:00", endTime: "19:30", priority: "medium", category: "fitness", status: "pending", completedAt: null, goalId: null, createdAt: iso(), updatedAt: iso() },
];

/* ─── Habits ─────────────────────────────────────── */
const h1: HabitDTO = { id: uuid(10), userId: uuid(0), name: "Read 20 minutes", description: "Any book, every day", days: [0,1,2,3,4,5,6], archived: false, createdAt: iso() };
const h2: HabitDTO = { id: uuid(11), userId: uuid(0), name: "Exercise", description: "Move your body", days: [1,3,5], archived: false, createdAt: iso() };
const h3: HabitDTO = { id: uuid(12), userId: uuid(0), name: "Plan tomorrow", description: "", days: [0,1,2,3,4,5,6], archived: false, createdAt: iso() };

function makeWeek(habit: HabitDTO, doneCount: number): HabitView["week"] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(TODAY, i - 6);
    const scheduled = habit.days.includes(weekdayOf(d));
    return { date: d, scheduled, done: scheduled && i < doneCount };
  });
}

export const DEMO_HABITS: HabitView[] = [
  { habit: h1, current: 5, longest: 12, doneToday: true, scheduledToday: true, week: makeWeek(h1, 6), totalCompletions: 34 },
  { habit: h2, current: 2, longest: 8, doneToday: false, scheduledToday: [1,3,5].includes(weekdayOf(TODAY)), week: makeWeek(h2, 4), totalCompletions: 18 },
  { habit: h3, current: 3, longest: 10, doneToday: false, scheduledToday: true, week: makeWeek(h3, 5), totalCompletions: 27 },
];

export const DEMO_COMPLETED_HABIT_IDS = [uuid(10)];

/* ─── Goals ──────────────────────────────────────── */
export const DEMO_GOALS: GoalDTO[] = [
  { id: uuid(20), userId: uuid(0), title: "Pass IELTS 7.5+", description: "Target band 7.5 in all sections", category: "study", targetDate: addDays(TODAY, 60), targetValue: 30, currentValue: 12, unit: "practice sets", status: "active", completedAt: null, createdAt: iso() },
  { id: uuid(21), userId: uuid(0), title: "Launch portfolio website", description: "Full responsive site with 3 case studies", category: "creative", targetDate: addDays(TODAY, 30), targetValue: 5, currentValue: 2, unit: "pages", status: "active", completedAt: null, createdAt: iso() },
  { id: uuid(22), userId: uuid(0), title: "Read 12 books this year", description: "", category: "personal", targetDate: null, targetValue: 12, currentValue: 7, unit: "books", status: "active", completedAt: null, createdAt: iso() },
];

/* ─── Sleep ──────────────────────────────────────── */
export const DEMO_SLEEP_SCHEDULE: SleepScheduleDTO = {
  id: uuid(30), userId: uuid(0), bedtime: "23:00", wakeTime: "06:30", toleranceMin: 15, updatedAt: iso(),
};

function makeSleepRows(): SleepRow[] {
  const data: [number, string, string, string, number, SleepStatus][] = [
    [-1, "23:15", "06:25", "Slept well", 430, "green"],
    [-2, "23:45", "07:10", "", 445, "yellow"],
    [-3, "23:00", "06:20", "Early night", 440, "green"],
    [-4, "00:30", "07:45", "Stayed up watching a movie", 435, "red"],
    [-5, "23:10", "06:35", "", 445, "green"],
    [-6, "23:30", "06:40", "", 430, "green"],
    [-7, "01:00", "06:50", "Couldn't fall asleep", 350, "red"],
  ];
  return data.map(([offset, bed, wake, note, dur, status]) => {
    const date = addDays(TODAY, offset);
    return {
      id: uuid(40 + Math.abs(offset)),
      date,
      startedAt: new Date(`${date}T${bed}:00+05:00`).toISOString(),
      endedAt: new Date(`${date}T${wake}:00+05:00`).toISOString(),
      note,
      durationMin: dur,
      status,
      startLabel: timeLabel(bed),
      endLabel: timeLabel(wake),
    };
  });
}

export const DEMO_SLEEP_ROWS = makeSleepRows();

export const DEMO_SLEEP_CHART: BarDatum[] = (() => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i - 6));
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return days.map((d) => {
    const row = DEMO_SLEEP_ROWS.find((r) => r.date === d);
    return {
      label: dayNames[new Date(`${d}T12:00:00Z`).getUTCDay()],
      sublabel: row ? formatDuration(row.durationMin ?? 0) : "",
      value: row?.durationMin ?? 0,
      tone: (row?.status === "green" ? "ok" : row?.status === "yellow" ? "warn" : row?.status === "red" ? "bad" : "muted") as "ok" | "warn" | "bad" | "muted",
    };
  });
})();

/* ─── Achievements ───────────────────────────────── */
export const DEMO_ACHIEVEMENTS: AchievementView[] = ACHIEVEMENTS.map((a) => {
  const unlocked = ["first_task","ten_tasks","first_habit","first_sleep","streak_3","green_3"].includes(a.key);
  const progressMap: Record<string, { current: number; target: number }> = {
    first_task: { current: 1, target: 1 }, ten_tasks: { current: 14, target: 10 },
    fifty_tasks: { current: 14, target: 50 }, streak_3: { current: 5, target: 3 },
    streak_7: { current: 5, target: 7 }, first_habit: { current: 1, target: 1 },
    habit_streak_7: { current: 5, target: 7 }, first_sleep: { current: 7, target: 1 },
    green_3: { current: 4, target: 3 }, goal_complete: { current: 0, target: 1 },
    challenge_10: { current: 0, target: 1 }, challenge_month: { current: 0, target: 1 },
  };
  return {
    key: a.key, title: a.title, description: a.description, icon: a.icon,
    unlocked, unlockedAt: unlocked ? addDays(TODAY, -3) : null,
    progress: progressMap[a.key] ?? { current: 0, target: 1 },
  };
});

/* ─── Challenges ─────────────────────────────────── */
export const DEMO_CHALLENGES: ChallengeView[] = [
  {
    id: uuid(50), type: "ten_day", startDate: addDays(TODAY, -4), endDate: addDays(TODAY, 5),
    status: "active", countedDays: 4, totalDays: 10, pct: 40, missedDays: 0,
    days: Array.from({ length: 10 }, (_, i) => {
      const d = addDays(addDays(TODAY, -4), i);
      return { date: d, state: d < TODAY ? "counted" as const : d === TODAY ? "today" as const : "future" as const };
    }),
  },
];

/* ─── Stats ──────────────────────────────────────── */
export const DEMO_WEEK_SERIES = Array.from({ length: 7 }, (_, i) => {
  const d = addDays(TODAY, i - 6);
  return { date: d, total: [3,5,4,6,3,2,7][i], done: [3,4,4,5,3,1,2][i] };
});

/* ─── Demo user ──────────────────────────────────── */
export const DEMO_USER = {
  name: "Asadbek", nickname: "Asad", email: "preview@lifeos.demo",
  timezone: TZ, theme: "dark", image: null, viaGoogle: false,
  createdAt: addDays(TODAY, -30), remindersEnabled: true,
  reminderStyle: "gentle", planningStyle: "balanced",
  lifeSituation: "university_student" as const,
  responsibilities: ["university", "fitness", "projects"],
  interests: ["education", "health", "creative", "habits"],
  habitFocus: ["study", "exercise", "reading"],
  dob: "2003-05-15", wakeTime: "06:30", bedTime: "23:00",
  phoneBeforeBed: "under_30", phoneAfterWake: "within_10",
  onboardingCompleted: true,
  schedule: { wakeTime: "06:30", bedTime: "23:00", commitment: "University 8:00–14:00", focusTime: "Mornings" },
  phoneHabits: { beforeBed: "under_30", afterWake: "within_10" },
};

export { TODAY, TZ, NOW_MIN };
