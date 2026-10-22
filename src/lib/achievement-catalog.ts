import type { StatsSnapshot } from "@/lib/stats";

/* Achievement catalog: pure definitions, no database imports.
 * Safe for "use client" components. DB-backed evaluation lives
 * in achievements.ts (server-only). */

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  earned: (s: StatsSnapshot) => boolean;
  progress: (s: StatsSnapshot) => { current: number; target: number };
}

const def = (
  key: string, title: string, description: string, icon: string,
  target: number, pick: (s: StatsSnapshot) => number,
): AchievementDef => ({
  key, title, description, icon,
  earned: (s) => pick(s) >= target,
  progress: (s) => ({ current: Math.min(pick(s), target), target }),
});

export const ACHIEVEMENTS: AchievementDef[] = [
  def("first_task", "First Step", "Complete your first task.", "check-circle-2", 1, (s) => s.tasksCompleted),
  def("ten_tasks", "Momentum", "Complete 10 tasks.", "zap", 10, (s) => s.tasksCompleted),
  def("fifty_tasks", "Half Century", "Complete 50 tasks.", "trophy", 50, (s) => s.tasksCompleted),
  def("streak_3", "Three Days Running", "Complete tasks on 3 consecutive days.", "flame", 3, (s) => Math.max(s.currentTaskStreak, s.longestTaskStreak)),
  def("streak_7", "One Strong Week", "Complete tasks on 7 consecutive days.", "calendar-check", 7, (s) => Math.max(s.currentTaskStreak, s.longestTaskStreak)),
  def("first_habit", "Habit Formed", "Record your first habit completion.", "sprout", 1, (s) => s.habitCompletions),
  def("habit_streak_7", "Weekly Rhythm", "Hold a 7-day streak on any habit.", "repeat", 7, (s) => s.bestHabitStreak),
  def("first_sleep", "Lights Out", "Record your first sleep session.", "moon", 1, (s) => s.sleepSessions),
  def("green_3", "In Tune", "Wake on schedule (green) 3 times.", "sunrise", 3, (s) => s.greenSleepSessions),
  def("goal_complete", "Goal Getter", "Complete a personal goal.", "target", 1, (s) => s.goalsCompleted),
  def("challenge_10", "Ten-Day Challenge", "Finish a 10-day challenge.", "flag", 1, (s) => s.challengesCompleted.filter((t) => t === "ten_day").length),
  def("challenge_month", "Monthly Master", "Finish a monthly challenge.", "medal", 1, (s) => s.challengesCompleted.filter((t) => t === "monthly").length),
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

export function earnedKeys(snapshot: StatsSnapshot): string[] {
  return ACHIEVEMENTS.filter((a) => a.earned(snapshot)).map((a) => a.key);
}
