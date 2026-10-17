"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Core types ─────────────────────────────────────────────────────── */

export type ProfileRow = {
  id: string; name: string; timezone: string;
  onboardingCompleted: boolean; createdAt: string;
};

export type PreferencesRow = {
  profileId: string;
  ageGroup: string | null; lifeStage: string | null; lifeStageOther: string | null;
  interests: string[]; interestsOther: string | null;
  objectives: string[]; objectivesOther: string | null;
  wakeTime: string | null; bedtime: string | null;
  commitments: string | null; personalTime: string | null;
  weekendVaries: boolean | null; planningStyle: string | null;
  difficulties: string[]; phoneBeforeBed: string | null;
  sleepTargetMinutes: number | null; hiddenSections: string[];
  theme: string; onboardingStep: number;
  reminderEnabled: boolean; language: string;
  updatedAt: string;
};

export type TaskRow = {
  id: string; profileId: string; goalId: string | null;
  title: string; notes: string | null; dueDate: string | null;
  priority: string; durationMinutes: number | null;
  status: string; source: string;
  completedAt: string | null; createdAt: string;
};

export type GoalRow = {
  id: string; profileId: string;
  title: string; description: string | null; category: string;
  targetDate: string | null; status: string;
  metricTarget: number | null; metricUnit: string | null;
  metricProgress: number; source: string; createdAt: string;
};

export type SleepSessionRow = {
  id: string; profileId: string;
  startedAt: string; endedAt: string | null;
  durationMinutes: number | null; manual: boolean; createdAt: string;
};

export type CheckinRow = {
  id: string; profileId: string; day: string;
  energy: string | null; activityMinutes: number | null;
  note: string | null; createdAt: string;
};

export type AssistantMessageRow = {
  id: string; profileId: string; role: "user" | "assistant";
  content: string; origin: "ai" | "rules"; createdAt: string;
};

export type HabitRow = {
  id: string; profileId: string;
  title: string; description: string | null;
  frequency: "daily" | "weekdays" | "weekends" | "custom";
  customDays: number[]; // 0=Sun … 6=Sat
  color: string; icon: string;
  status: "active" | "paused" | "archived"; createdAt: string;
};

export type HabitLogRow = {
  id: string; habitId: string; profileId: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
};

/* ─── Lamp / Goal-Reminder types ─────────────────────────────────────── */

export type LampReminderState =
  | "idle"       // before scheduled time
  | "upcoming"   // <15 min away
  | "active"     // lamp is ON (time arrived, not yet actioned)
  | "snoozed"    // snoozed, next trigger pending
  | "completed"  // user marked done
  | "missed";    // passed without action

export type ScheduledGoalRow = {
  id: string; profileId: string; goalId: string;
  // date+time the lamp fires  (ISO local, e.g. "2025-07-20T20:00")
  scheduledAt: string;
  duration: number | null; // minutes
  repeat: "once" | "daily" | "weekdays" | "weekends" | "custom";
  repeatDays: number[]; // 0-6
  state: LampReminderState;
  snoozeUntil: string | null; // ISO
  completedAt: string | null;
  missedAt: string | null;
  note: string | null;
  createdAt: string;
};

/* ─── Default factory ─────────────────────────────────────────────────── */

export function defaultPrefs(profileId: string): PreferencesRow {
  return {
    profileId, ageGroup: null, lifeStage: null, lifeStageOther: null,
    interests: [], interestsOther: null, objectives: [], objectivesOther: null,
    wakeTime: "07:00", bedtime: "23:00", commitments: null, personalTime: null,
    weekendVaries: null, planningStyle: null, difficulties: [],
    phoneBeforeBed: null, sleepTargetMinutes: 480, hiddenSections: [],
    theme: "system", onboardingStep: 0,
    reminderEnabled: true, language: "uz",
    updatedAt: new Date().toISOString(),
  };
}

/* ─── Storage core ────────────────────────────────────────────────────── */

export const Storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const v = localStorage.getItem(`lifeos_${key}`);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch { return fallback; }
  },
  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(`lifeos_${key}`, JSON.stringify(value)); }
    catch { /* quota */ }
  },

  /* — Profile — */
  getProfiles(): ProfileRow[] { return this.get("profiles", []); },
  getProfile(id: string): ProfileRow | null {
    return this.getProfiles().find(p => p.id === id) ?? null;
  },
  saveProfile(p: ProfileRow): void {
    const list = this.getProfiles().filter(x => x.id !== p.id);
    this.set("profiles", [...list, p]);
  },
  deleteProfile(id: string): void {
    this.set("profiles", this.getProfiles().filter(x => x.id !== id));
    (["prefs","tasks","goals","sleep","checkins","messages","habits","habit_logs","scheduled_goals"] as const)
      .forEach(k => {
        const arr = this.get<Array<{ profileId?: string }>>(k, []);
        this.set(k, arr.filter(x => x.profileId !== id));
      });
  },

  /* — Prefs — */
  getPrefs(profileId: string): PreferencesRow {
    const list = this.get<PreferencesRow[]>("prefs", []);
    return list.find(p => p.profileId === profileId) ?? defaultPrefs(profileId);
  },
  savePrefs(p: PreferencesRow): void {
    const list = this.get<PreferencesRow[]>("prefs", []).filter(x => x.profileId !== p.profileId);
    this.set("prefs", [...list, p]);
  },

  /* — Tasks — */
  getTasks(): TaskRow[] { return this.get("tasks", []); },
  saveTask(t: TaskRow): void {
    this.set("tasks", [...this.getTasks().filter(x => x.id !== t.id), t]);
  },
  deleteTask(id: string): void { this.set("tasks", this.getTasks().filter(x => x.id !== id)); },

  /* — Goals — */
  getGoals(): GoalRow[] { return this.get("goals", []); },
  saveGoal(g: GoalRow): void {
    this.set("goals", [...this.getGoals().filter(x => x.id !== g.id), g]);
  },
  deleteGoal(id: string): void { this.set("goals", this.getGoals().filter(x => x.id !== id)); },

  /* — Sleep — */
  getSleeps(): SleepSessionRow[] { return this.get("sleep", []); },
  saveSleep(s: SleepSessionRow): void {
    this.set("sleep", [...this.getSleeps().filter(x => x.id !== s.id), s]);
  },
  deleteSleep(id: string): void { this.set("sleep", this.getSleeps().filter(x => x.id !== id)); },

  /* — Check-ins — */
  getCheckins(): CheckinRow[] { return this.get("checkins", []); },
  saveCheckin(c: CheckinRow): void {
    this.set("checkins", [...this.getCheckins().filter(x => x.id !== c.id), c]);
  },

  /* — Messages — */
  getMessages(): AssistantMessageRow[] { return this.get("messages", []); },
  saveMessage(m: AssistantMessageRow): void {
    this.set("messages", [...this.getMessages().filter(x => x.id !== m.id), m]);
  },

  /* — Habits — */
  getHabits(): HabitRow[] { return this.get("habits", []); },
  saveHabit(h: HabitRow): void {
    this.set("habits", [...this.getHabits().filter(x => x.id !== h.id), h]);
  },
  deleteHabit(id: string): void { this.set("habits", this.getHabits().filter(x => x.id !== id)); },

  /* — Habit Logs — */
  getHabitLogs(): HabitLogRow[] { return this.get("habit_logs", []); },
  saveHabitLog(l: HabitLogRow): void {
    this.set("habit_logs", [...this.getHabitLogs().filter(x => x.id !== l.id), l]);
  },
  deleteHabitLog(id: string): void { this.set("habit_logs", this.getHabitLogs().filter(x => x.id !== id)); },
  getHabitLogForDate(habitId: string, date: string): HabitLogRow | null {
    return this.getHabitLogs().find(l => l.habitId === habitId && l.date === date) ?? null;
  },

  /* — Scheduled goals (lamp reminders) — */
  getScheduledGoals(): ScheduledGoalRow[] { return this.get("scheduled_goals", []); },
  saveScheduledGoal(s: ScheduledGoalRow): void {
    this.set("scheduled_goals", [...this.getScheduledGoals().filter(x => x.id !== s.id), s]);
  },
  deleteScheduledGoal(id: string): void {
    this.set("scheduled_goals", this.getScheduledGoals().filter(x => x.id !== id));
  },

  /* — Session — */
  getCurrentProfileId(): string | null {
    if (typeof window === "undefined") return null;
    const local = window.localStorage.getItem("lifeos_current_profile");
    if (local) return local;
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(^| )lifeos_profile=([^;]+)/);
      if (m?.[2]) {
        window.localStorage.setItem("lifeos_current_profile", m[2]);
        return m[2];
      }
    }
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
};

/* ─── Utility ─────────────────────────────────────────────────────────── */

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/** today as YYYY-MM-DD in local timezone */
export function todayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** format HH:MM from ISO or Date */
export function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** format duration in minutes to "Xh Ym" */
export function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Compute next fire time for a ScheduledGoalRow */
export function nextFireTime(sg: ScheduledGoalRow): Date | null {
  if (sg.state === "completed") return null;
  if (sg.state === "snoozed" && sg.snoozeUntil) return new Date(sg.snoozeUntil);

  const base = new Date(sg.scheduledAt);
  if (sg.repeat === "once") return base > new Date() ? base : null;

  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(base.getHours(), base.getMinutes(), 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);

  if (sg.repeat === "daily") return candidate;
  if (sg.repeat === "weekdays") {
    while ([0, 6].includes(candidate.getDay())) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }
  if (sg.repeat === "weekends") {
    while (![0, 6].includes(candidate.getDay())) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }
  if (sg.repeat === "custom" && sg.repeatDays.length > 0) {
    for (let i = 0; i < 8; i++) {
      const c = new Date(candidate);
      c.setDate(c.getDate() + i);
      if (sg.repeatDays.includes(c.getDay())) return c;
    }
  }
  return null;
}

/** React hook — hydrates storage on mount and forces a re-read */
export function useData<T>(read: () => T, deps: unknown[] = []): T {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return read();
    return read();
  });
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    setValue(read());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Re-run when Storage changes (storage event from other tabs)
  useEffect(() => {
    const handler = () => { if (mounted.current) setValue(read()); };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

/** Simple hook to get profile and prefs, re-reads on mount only */
export function useProfile() {
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMounted(true);
    setPid(Storage.getCurrentProfileId());
  }, []);

  const profile = pid ? Storage.getProfile(pid) : null;
  const prefs   = pid ? Storage.getPrefs(pid)   : null;
  return { mounted, pid, profile, prefs };
}
