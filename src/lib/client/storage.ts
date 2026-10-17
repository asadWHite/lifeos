"use client";

import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════
   LIFEOS — Complete Data Model & Storage
   Local-first: localStorage with structured types
═══════════════════════════════════════════════════════════ */

/* ─── Types ─── */

export type ProfileRow = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  timezone: string;
  onboardingCompleted: boolean;
  createdAt: string;
};

export type PreferencesRow = {
  profileId: string;
  ageGroup: string | null;
  lifeStage: string | null;
  interests: string[];
  objectives: string[];
  wakeTime: string | null;
  bedtime: string | null;
  planningStyle: string | null;
  difficulties: string[];
  phoneBeforeBed: string | null;
  phoneAfterWake: string | null;
  sleepTargetMinutes: number | null;
  dailyGoalTarget: number;       // # tasks to qualify streak day
  theme: string;
  language: string;
  reminderEnabled: boolean;
  onboardingStep: number;
  updatedAt: string;
};

export type TaskRow = {
  id: string;
  profileId: string;
  goalId: string | null;
  title: string;
  notes: string | null;
  dueDate: string | null;
  dueTime: string | null;
  priority: "low" | "normal" | "high";
  category: string;
  isPriority: boolean;           // counts toward daily streak
  durationMinutes: number | null;
  status: "todo" | "done";
  source: string;
  completedAt: string | null;
  createdAt: string;
};

export type GoalRow = {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  category: string;
  targetDate: string | null;
  status: "active" | "paused" | "completed" | "archived";
  metricTarget: number | null;
  metricUnit: string | null;
  metricProgress: number;
  source: string;
  createdAt: string;
};

export type HabitRow = {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  frequency: "daily" | "weekdays" | "weekends" | "custom";
  customDays: number[];
  color: string;
  icon: string;
  status: "active" | "paused" | "archived";
  createdAt: string;
};

export type HabitLogRow = {
  id: string;
  habitId: string;
  profileId: string;
  date: string;
  createdAt: string;
};

export type SleepSessionRow = {
  id: string;
  profileId: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  manual: boolean;
  phoneBeforeBed: boolean | null;
  phoneAfterWake: boolean | null;
  createdAt: string;
};

export type CheckinRow = {
  id: string;
  profileId: string;
  day: string;
  energy: string | null;
  activityMinutes: number | null;
  note: string | null;
  createdAt: string;
};

/* ─── Lamp / Scheduler types ─── */

export type LampReminderState =
  | "idle" | "upcoming" | "active" | "snoozed" | "completed" | "missed";

export type ScheduledGoalRow = {
  id: string;
  profileId: string;
  goalId: string;
  scheduledAt: string;
  duration: number | null;
  repeat: "once" | "daily" | "weekdays" | "weekends" | "custom";
  repeatDays: number[];
  state: LampReminderState;
  snoozeUntil: string | null;
  completedAt: string | null;
  missedAt: string | null;
  note: string | null;
  createdAt: string;
};

/* ─── Achievement types ─── */

export type AchievementId =
  | "first_step"
  | "streak_3" | "streak_7" | "streak_10" | "streak_14" | "streak_30"
  | "consistent_month" | "sleep_routine" | "goal_master" | "focused_planner";

export type AchievementRow = {
  id: AchievementId;
  profileId: string;
  earnedAt: string;        // ISO — when unlocked
  shown: boolean;          // whether reward animation was displayed
};

/* ─── Monthly challenge ─── */

export type MonthlyChallenge = {
  id: string;
  profileId: string;
  year: number;
  month: number;           // 1-12
  targetDays: number;      // required qualifying days
  completedDays: string[]; // array of YYYY-MM-DD
  won: boolean;
  createdAt: string;
};

/* ─── Achievement definitions ─── */

export type AchievementDef = {
  id: AchievementId;
  name: string;
  description: string;
  category: string;
  icon: string;
  rule: string;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_step",        name: "Birinchi qadam",      description: "Birinchi maqsadni bajaring",                 category: "start",    icon: "🌱", rule: "1 ta maqsad" },
  { id: "streak_3",          name: "3 kunlik ketma-ketlik", description: "3 kun ketma-ket",                          category: "streak",   icon: "🔥", rule: "3 kun" },
  { id: "streak_7",          name: "Haftalik qahramon",   description: "7 kun ketma-ket",                            category: "streak",   icon: "⚡", rule: "7 kun" },
  { id: "streak_10",         name: "10 kunlik ustun",     description: "10 kun ketma-ket",                           category: "streak",   icon: "💎", rule: "10 kun" },
  { id: "streak_14",         name: "2 haftalik qozon",    description: "14 kun ketma-ket",                           category: "streak",   icon: "🏆", rule: "14 kun" },
  { id: "streak_30",         name: "30 kunlik afsonaviy", description: "30 kun ketma-ket — ajoyib!",                 category: "streak",   icon: "👑", rule: "30 kun" },
  { id: "consistent_month",  name: "Izchil oy",           description: "Bir oyda 20+ kun bajarish",                  category: "month",    icon: "📅", rule: "Oyda 20 kun" },
  { id: "sleep_routine",     name: "Uyqu ustasi",         description: "7 kun uyqu rejimini saqlash",                category: "sleep",    icon: "🌙", rule: "7 kun uyqu" },
  { id: "goal_master",       name: "Maqsad ustasi",       description: "5 ta maqsadni tugatish",                     category: "goals",    icon: "🎯", rule: "5 maqsad" },
  { id: "focused_planner",   name: "Diqqatli rejachi",    description: "5 kun ustuvor vazifalarni bajarish",         category: "plan",     icon: "🧭", rule: "5 kun ustuvor" },
];

/* ═══════════════════════════════════════════════════════════
   STORAGE CORE
═══════════════════════════════════════════════════════════ */

export const Storage = {
  _get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const v = localStorage.getItem(`lifeos_${key}`);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch { return fallback; }
  },
  _set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(`lifeos_${key}`, JSON.stringify(value)); } catch {}
  },

  /* — Profile — */
  getProfiles(): ProfileRow[] { return this._get("profiles", []); },
  getProfile(id: string): ProfileRow | null { return this.getProfiles().find(p => p.id === id) ?? null; },
  saveProfile(p: ProfileRow): void {
    this._set("profiles", [...this.getProfiles().filter(x => x.id !== p.id), p]);
  },
  deleteProfile(id: string): void {
    this._set("profiles", this.getProfiles().filter(x => x.id !== id));
    ["prefs","tasks","goals","sleep","checkins","habits","habit_logs","scheduled_goals","achievements","challenges"]
      .forEach(k => this._set(k, (this._get<Array<{ profileId?: string }>>(k, [])).filter(x => x.profileId !== id)));
  },

  /* — Prefs — */
  getPrefs(profileId: string): PreferencesRow {
    const list = this._get<PreferencesRow[]>("prefs", []);
    return list.find(p => p.profileId === profileId) ?? defaultPrefs(profileId);
  },
  savePrefs(p: PreferencesRow): void {
    this._set("prefs", [...this._get<PreferencesRow[]>("prefs", []).filter(x => x.profileId !== p.profileId), p]);
  },

  /* — Tasks — */
  getTasks(profileId?: string): TaskRow[] {
    const all = this._get<TaskRow[]>("tasks", []);
    return profileId ? all.filter(t => t.profileId === profileId) : all;
  },
  saveTask(t: TaskRow): void { this._set("tasks", [...this.getTasks().filter(x => x.id !== t.id), t]); },
  deleteTask(id: string): void { this._set("tasks", this.getTasks().filter(x => x.id !== id)); },

  /* — Goals — */
  getGoals(profileId?: string): GoalRow[] {
    const all = this._get<GoalRow[]>("goals", []);
    return profileId ? all.filter(g => g.profileId === profileId) : all;
  },
  saveGoal(g: GoalRow): void { this._set("goals", [...this.getGoals().filter(x => x.id !== g.id), g]); },
  deleteGoal(id: string): void { this._set("goals", this.getGoals().filter(x => x.id !== id)); },

  /* — Habits — */
  getHabits(profileId?: string): HabitRow[] {
    const all = this._get<HabitRow[]>("habits", []);
    return profileId ? all.filter(h => h.profileId === profileId) : all;
  },
  saveHabit(h: HabitRow): void { this._set("habits", [...this.getHabits().filter(x => x.id !== h.id), h]); },
  deleteHabit(id: string): void { this._set("habits", this.getHabits().filter(x => x.id !== id)); },

  /* — Habit Logs — */
  getHabitLogs(profileId?: string): HabitLogRow[] {
    const all = this._get<HabitLogRow[]>("habit_logs", []);
    return profileId ? all.filter(l => l.profileId === profileId) : all;
  },
  saveHabitLog(l: HabitLogRow): void { this._set("habit_logs", [...this.getHabitLogs().filter(x => x.id !== l.id), l]); },
  deleteHabitLog(id: string): void { this._set("habit_logs", this.getHabitLogs().filter(x => x.id !== id)); },
  getHabitLogForDate(habitId: string, date: string): HabitLogRow | null {
    return this.getHabitLogs().find(l => l.habitId === habitId && l.date === date) ?? null;
  },

  /* — Sleep — */
  getSleeps(profileId?: string): SleepSessionRow[] {
    const all = this._get<SleepSessionRow[]>("sleep", []);
    return profileId ? all.filter(s => s.profileId === profileId) : all;
  },
  saveSleep(s: SleepSessionRow): void { this._set("sleep", [...this.getSleeps().filter(x => x.id !== s.id), s]); },
  deleteSleep(id: string): void { this._set("sleep", this.getSleeps().filter(x => x.id !== id)); },

  /* — Checkins — */
  getCheckins(profileId?: string): CheckinRow[] {
    const all = this._get<CheckinRow[]>("checkins", []);
    return profileId ? all.filter(c => c.profileId === profileId) : all;
  },
  saveCheckin(c: CheckinRow): void { this._set("checkins", [...this.getCheckins().filter(x => x.id !== c.id), c]); },

  /* — Scheduled Goals — */
  getScheduledGoals(profileId?: string): ScheduledGoalRow[] {
    const all = this._get<ScheduledGoalRow[]>("scheduled_goals", []);
    return profileId ? all.filter(s => s.profileId === profileId) : all;
  },
  saveScheduledGoal(s: ScheduledGoalRow): void {
    this._set("scheduled_goals", [...this.getScheduledGoals().filter(x => x.id !== s.id), s]);
  },
  deleteScheduledGoal(id: string): void { this._set("scheduled_goals", this.getScheduledGoals().filter(x => x.id !== id)); },

  /* — Achievements — */
  getAchievements(profileId: string): AchievementRow[] {
    return this._get<AchievementRow[]>("achievements", []).filter(a => a.profileId === profileId);
  },
  saveAchievement(a: AchievementRow): void {
    const all = this._get<AchievementRow[]>("achievements", []);
    const exists = all.find(x => x.id === a.id && x.profileId === a.profileId);
    if (!exists) this._set("achievements", [...all, a]);
  },
  markAchievementShown(profileId: string, id: AchievementId): void {
    const all = this._get<AchievementRow[]>("achievements", []);
    this._set("achievements", all.map(a => a.id === id && a.profileId === profileId ? { ...a, shown: true } : a));
  },

  /* — Monthly Challenges — */
  getChallenges(profileId: string): MonthlyChallenge[] {
    return this._get<MonthlyChallenge[]>("challenges", []).filter(c => c.profileId === profileId);
  },
  saveChallenge(c: MonthlyChallenge): void {
    const all = this._get<MonthlyChallenge[]>("challenges", []);
    this._set("challenges", [...all.filter(x => x.id !== c.id), c]);
  },

  /* — Session — */
  getCurrentProfileId(): string | null {
    if (typeof window === "undefined") return null;
    const local = window.localStorage.getItem("lifeos_current_profile");
    if (local) return local;
    const m = typeof document !== "undefined" ? document.cookie.match(/(^| )lifeos_profile=([^;]+)/) : null;
    if (m?.[2]) { window.localStorage.setItem("lifeos_current_profile", m[2]); return m[2]; }
    return null;
  },
  setCurrentProfileId(id: string | null): void {
    if (typeof window === "undefined") return;
    if (id) {
      window.localStorage.setItem("lifeos_current_profile", id);
      document.cookie = `lifeos_profile=${id}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      window.localStorage.removeItem("lifeos_current_profile");
      document.cookie = "lifeos_profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  },

  /* ─── Achievement Engine ─── */
  checkAndUnlockAchievements(profileId: string): AchievementId[] {
    const earned = this.getAchievements(profileId).map(a => a.id);
    const newlyEarned: AchievementId[] = [];
    const now = new Date().toISOString();

    const unlock = (id: AchievementId) => {
      if (!earned.includes(id)) {
        this.saveAchievement({ id, profileId, earnedAt: now, shown: false });
        newlyEarned.push(id);
      }
    };

    // First step
    const completedGoals = this.getScheduledGoals(profileId).filter(s => s.state === "completed");
    if (completedGoals.length >= 1) unlock("first_step");

    // Streak-based
    const streak = computeStreak(profileId);
    if (streak >= 3)  unlock("streak_3");
    if (streak >= 7)  unlock("streak_7");
    if (streak >= 10) unlock("streak_10");
    if (streak >= 14) unlock("streak_14");
    if (streak >= 30) unlock("streak_30");

    // Sleep routine (7 days following schedule)
    const prefs = this.getPrefs(profileId);
    if (prefs.wakeTime) {
      const sleeps = this.getSleeps(profileId).filter(s => s.endedAt && s.durationMinutes && s.durationMinutes >= 120);
      if (sleeps.length >= 7) unlock("sleep_routine");
    }

    // Goal master (5 completed goals)
    const completedGoalCount = this.getGoals(profileId).filter(g => g.status === "completed").length;
    if (completedGoalCount >= 5) unlock("goal_master");

    // Consistent month
    const d = new Date();
    const challenge = this.getChallenges(profileId).find(c => c.year === d.getFullYear() && c.month === d.getMonth() + 1);
    if (challenge && challenge.completedDays.length >= 20) unlock("consistent_month");

    // Focused planner
    const tasks = this.getTasks(profileId);
    const priorityDates = new Set(
      tasks.filter(t => t.isPriority && t.status === "done" && t.completedAt)
        .map(t => t.completedAt!.slice(0, 10))
    );
    if (priorityDates.size >= 5) unlock("focused_planner");

    return newlyEarned;
  },
};

/* ─── Default factories ─── */

export function defaultPrefs(profileId: string): PreferencesRow {
  return {
    profileId, ageGroup: null, lifeStage: null, interests: [], objectives: [],
    wakeTime: "07:00", bedtime: "23:00", planningStyle: null, difficulties: [],
    phoneBeforeBed: null, phoneAfterWake: null, sleepTargetMinutes: 480,
    dailyGoalTarget: 1, theme: "system", language: "uz",
    reminderEnabled: true, onboardingStep: 0, updatedAt: new Date().toISOString(),
  };
}

/* ─── Utility functions ─── */

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
}

export function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes < 0) return "—";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function nextFireTime(sg: ScheduledGoalRow): Date | null {
  if (sg.state === "completed") return null;
  if (sg.state === "snoozed" && sg.snoozeUntil) return new Date(sg.snoozeUntil);
  const base = new Date(sg.scheduledAt);
  if (sg.repeat === "once") {
    // If the time hasn't passed yet return it, otherwise null
    return base > new Date() ? base : (sg.state === "active" ? base : null);
  }
  const now = new Date();
  const cand = new Date(now);
  cand.setHours(base.getHours(), base.getMinutes(), 0, 0);
  if (cand <= now) cand.setDate(cand.getDate() + 1);
  if (sg.repeat === "daily") return cand;
  if (sg.repeat === "weekdays") { while ([0,6].includes(cand.getDay())) cand.setDate(cand.getDate() + 1); return cand; }
  if (sg.repeat === "weekends") { while (![0,6].includes(cand.getDay())) cand.setDate(cand.getDate() + 1); return cand; }
  if (sg.repeat === "custom" && sg.repeatDays.length > 0) {
    for (let i = 0; i < 8; i++) { const c = new Date(cand); c.setDate(c.getDate() + i); if (sg.repeatDays.includes(c.getDay())) return c; }
  }
  return null;
}

/**
 * Compute current streak: consecutive days where the user
 * completed at least `dailyGoalTarget` priority tasks
 */
export function computeStreak(profileId: string): number {
  const prefs = Storage.getPrefs(profileId);
  const target = prefs.dailyGoalTarget || 1;
  const tasks = Storage.getTasks(profileId);

  // Build set of qualifying dates (local date of completedAt)
  const qualifyingDays = new Set<string>();
  for (const t of tasks) {
    if (t.status === "done" && t.completedAt) {
      const day = t.completedAt.slice(0, 10);
      qualifyingDays.add(day);
    }
  }

  // Also count scheduled goal completions
  for (const sg of Storage.getScheduledGoals(profileId)) {
    if (sg.state === "completed" && sg.completedAt) {
      qualifyingDays.add(sg.completedAt.slice(0, 10));
    }
  }

  // Check if enough tasks completed per day (use task counts)
  const taskCountByDay = new Map<string, number>();
  for (const t of tasks) {
    if (t.status === "done" && t.completedAt && t.isPriority) {
      const day = t.completedAt.slice(0, 10);
      taskCountByDay.set(day, (taskCountByDay.get(day) ?? 0) + 1);
    }
  }

  // Walk backwards from today
  let streak = 0;
  const cur = new Date(todayDate() + "T00:00:00");
  while (true) {
    const dayStr = cur.toISOString().slice(0, 10);
    const count = taskCountByDay.get(dayStr) ?? 0;
    const hasGoalCompletion = qualifyingDays.has(dayStr);
    if (count >= target || hasGoalCompletion) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Ensure current month's challenge exists for profile
 */
export function ensureMonthlyChallenge(profileId: string): MonthlyChallenge {
  const d = new Date();
  const year = d.getFullYear(), month = d.getMonth() + 1;
  const existing = Storage.getChallenges(profileId).find(c => c.year === year && c.month === month);
  if (existing) return existing;
  const challenge: MonthlyChallenge = {
    id: `${profileId}_${year}_${month}`, profileId, year, month,
    targetDays: 20, completedDays: [], won: false, createdAt: new Date().toISOString(),
  };
  Storage.saveChallenge(challenge);
  return challenge;
}

/** Sleep status: green/yellow/red */
export function sleepStatus(session: SleepSessionRow, prefs: PreferencesRow): "green" | "yellow" | "red" | null {
  if (!session.durationMinutes) return null;
  if (session.durationMinutes < 120) return "red";
  if (!prefs.wakeTime || !session.endedAt) return null;
  const wakeH = new Date(session.endedAt).getHours() * 60 + new Date(session.endedAt).getMinutes();
  const [th, tm] = prefs.wakeTime.split(":").map(Number);
  const target = th * 60 + tm;
  const diff = wakeH - target;
  if (diff <= 30) return "green";
  if (diff <= 90) return "yellow";
  return "red";
}

/* ─── React hook ─── */
export function useProfile() {
  const [pid, setPid] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMounted(true); setPid(Storage.getCurrentProfileId()); }, []);
  const profile = pid ? Storage.getProfile(pid) : null;
  const prefs   = pid ? Storage.getPrefs(pid)   : null;
  return { mounted, pid, profile, prefs };
}
