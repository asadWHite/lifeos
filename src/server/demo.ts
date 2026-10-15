import "server-only";
/**
 * In-memory demo store — the FULL app works without a database.
 * Data lives in server memory (persists across warm requests, resets on cold start).
 * A small banner tells the user this is demo mode.
 */

import type { ProfileRow, PreferencesRow, TaskRow, GoalRow, SleepSessionRow, CheckinRow, AssistantMessageRow } from "@/db/schema";

export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL;
}

// ---- Storage ----
const profilesMap = new Map<string, ProfileRow>();
const prefsMap = new Map<string, PreferencesRow>();
const tasksMap = new Map<string, TaskRow>();
const goalsMap = new Map<string, GoalRow>();
const sleepMap = new Map<string, SleepSessionRow>();
const checkinsMap = new Map<string, CheckinRow>();
const messagesMap = new Map<string, AssistantMessageRow>();

function uid(): string {
  return crypto.randomUUID();
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ---- Profiles ----
export function demoListProfiles(): ProfileRow[] {
  return [...profilesMap.values()].sort((a,b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export function demoGetProfile(id: string): ProfileRow | null {
  return profilesMap.get(id) ?? null;
}

export function demoCreateProfile(name: string, timezone: string): ProfileRow {
  const p: ProfileRow = {
    id: uid(), name, timezone, onboardingCompleted: false, createdAt: new Date(),
  };
  profilesMap.set(p.id, p);
  return p;
}

export function demoUpdateProfile(id: string, patch: Partial<ProfileRow>): void {
  const p = profilesMap.get(id);
  if (p) profilesMap.set(id, { ...p, ...patch });
}

export function demoDeleteProfile(id: string): void {
  profilesMap.delete(id);
  prefsMap.delete(id);
  for (const [k,v] of tasksMap) if (v.profileId === id) tasksMap.delete(k);
  for (const [k,v] of goalsMap) if (v.profileId === id) goalsMap.delete(k);
  for (const [k,v] of sleepMap) if (v.profileId === id) sleepMap.delete(k);
  for (const [k,v] of checkinsMap) if (v.profileId === id) checkinsMap.delete(k);
  for (const [k,v] of messagesMap) if (v.profileId === id) messagesMap.delete(k);
}

// ---- Preferences ----
export function demoDefaultPrefs(profileId: string): PreferencesRow {
  return {
    profileId, ageGroup: null, lifeStage: null, lifeStageOther: null,
    interests: [], interestsOther: null, objectives: [], objectivesOther: null,
    wakeTime: null, bedtime: null, commitments: null, personalTime: null,
    weekendVaries: null, planningStyle: null, difficulties: [],
    phoneBeforeBed: null, sleepTargetMinutes: null, hiddenSections: [],
    theme: "system", onboardingStep: 0, updatedAt: new Date(0),
  };
}

export function demoGetPrefs(profileId: string): PreferencesRow {
  return prefsMap.get(profileId) ?? demoDefaultPrefs(profileId);
}

export function demoUpsertPrefs(profileId: string, patch: Partial<PreferencesRow>): void {
  const existing = prefsMap.get(profileId) ?? demoDefaultPrefs(profileId);
  prefsMap.set(profileId, { ...existing, ...patch, profileId, updatedAt: new Date() });
}

// ---- Tasks ----
export function demoListTasks(profileId: string): TaskRow[] {
  const pri: Record<string,number> = { high: 0, normal: 1, low: 2 };
  return [...tasksMap.values()]
    .filter(t => t.profileId === profileId)
    .sort((a,b) => {
      const da = a.status==="done"?1:0, db2 = b.status==="done"?1:0;
      if (da!==db2) return da-db2;
      const ad = a.dueDate??"9999", bd = b.dueDate??"9999";
      if (ad!==bd) return ad<bd?-1:1;
      return (pri[a.priority]??1) - (pri[b.priority]??1);
    });
}

export function demoCreateTask(profileId: string, data: {
  title: string; notes?: string|null; dueDate?: string|null; priority?: string;
  durationMinutes?: number|null; goalId?: string|null; source?: string;
}): TaskRow {
  const t: TaskRow = {
    id: uid(), profileId, title: data.title, notes: data.notes??null,
    dueDate: data.dueDate??null, priority: data.priority??"normal",
    durationMinutes: data.durationMinutes??null, status: "todo",
    source: data.source??"user", goalId: data.goalId??null,
    completedAt: null, createdAt: new Date(),
  };
  tasksMap.set(t.id, t);
  return t;
}

export function demoUpdateTask(id: string, profileId: string, patch: Partial<TaskRow>): boolean {
  const t = tasksMap.get(id);
  if (!t || t.profileId !== profileId) return false;
  tasksMap.set(id, { ...t, ...patch });
  return true;
}

export function demoToggleTask(id: string, profileId: string): boolean {
  const t = tasksMap.get(id);
  if (!t || t.profileId !== profileId) return false;
  const done = t.status !== "done";
  tasksMap.set(id, { ...t, status: done?"done":"todo", completedAt: done?new Date():null });
  return true;
}

export function demoDeleteTask(id: string, profileId: string): boolean {
  const t = tasksMap.get(id);
  if (!t || t.profileId !== profileId) return false;
  tasksMap.delete(id);
  return true;
}

export function demoDeleteLifeosTasks(profileId: string): void {
  for (const [k,v] of tasksMap) {
    if (v.profileId === profileId && v.source === "lifeos" && v.status === "todo") tasksMap.delete(k);
  }
}

export function demoTasksCompletedSince(profileId: string, sinceIso: string): TaskRow[] {
  return [...tasksMap.values()].filter(t =>
    t.profileId===profileId && t.status==="done" && t.completedAt &&
    new Date(t.completedAt) >= new Date(`${sinceIso}T00:00:00Z`)
  );
}

// ---- Goals ----
export function demoListGoals(profileId: string): GoalRow[] {
  return [...goalsMap.values()].filter(g => g.profileId===profileId);
}

export function demoCreateGoal(profileId: string, data: {
  title: string; description?: string|null; category?: string;
  targetDate?: string|null; metricTarget?: number|null; metricUnit?: string|null; source?: string;
}): GoalRow {
  const g: GoalRow = {
    id: uid(), profileId, title: data.title, description: data.description??null,
    category: data.category??"personal", targetDate: data.targetDate??null,
    status: "active", metricTarget: data.metricTarget??null,
    metricUnit: data.metricUnit??null, metricProgress: 0,
    source: data.source??"user", createdAt: new Date(),
  };
  goalsMap.set(g.id, g);
  return g;
}

export function demoUpdateGoal(id: string, profileId: string, patch: Partial<GoalRow>): boolean {
  const g = goalsMap.get(id);
  if (!g || g.profileId!==profileId) return false;
  goalsMap.set(id, { ...g, ...patch });
  return true;
}

export function demoDeleteGoal(id: string, profileId: string): boolean {
  const g = goalsMap.get(id);
  if (!g || g.profileId!==profileId) return false;
  goalsMap.delete(id);
  return true;
}

export function demoGoalByTitle(profileId: string, title: string): GoalRow|null {
  return [...goalsMap.values()].find(g => g.profileId===profileId && g.title===title) ?? null;
}

// ---- Sleep ----
export function demoGetActiveSleep(profileId: string): SleepSessionRow|null {
  return [...sleepMap.values()].find(s => s.profileId===profileId && !s.endedAt) ?? null;
}

export function demoListSleep(profileId: string, limit=60): SleepSessionRow[] {
  return [...sleepMap.values()]
    .filter(s => s.profileId===profileId && s.endedAt)
    .sort((a,b) => +new Date(b.startedAt) - +new Date(a.startedAt))
    .slice(0, limit);
}

export function demoStartSleep(profileId: string): SleepSessionRow {
  const s: SleepSessionRow = {
    id: uid(), profileId, startedAt: new Date(), endedAt: null,
    durationMinutes: null, manual: false, createdAt: new Date(),
  };
  sleepMap.set(s.id, s);
  return s;
}

export function demoEndSleep(id: string, endedAt: Date, durationMinutes: number): void {
  const s = sleepMap.get(id);
  if (s) sleepMap.set(id, { ...s, endedAt, durationMinutes });
}

export function demoCorrectSleep(id: string, profileId: string, startedAt: Date, endedAt: Date, dur: number): boolean {
  const s = sleepMap.get(id);
  if (!s || s.profileId!==profileId) return false;
  sleepMap.set(id, { ...s, startedAt, endedAt, durationMinutes: dur, manual: true });
  return true;
}

export function demoDeleteSleep(id: string, profileId: string): boolean {
  const s = sleepMap.get(id);
  if (!s || s.profileId!==profileId) return false;
  sleepMap.delete(id);
  return true;
}

// ---- Check-ins ----
export function demoGetCheckin(profileId: string, day: string): CheckinRow|null {
  return [...checkinsMap.values()].find(c => c.profileId===profileId && c.day===day) ?? null;
}

export function demoUpsertCheckin(profileId: string, day: string, patch: Partial<CheckinRow>): void {
  const existing = demoGetCheckin(profileId, day);
  if (existing) {
    checkinsMap.set(existing.id, { ...existing, ...patch });
  } else {
    const c: CheckinRow = {
      id: uid(), profileId, day, energy: patch.energy??null,
      activityMinutes: patch.activityMinutes??null, note: patch.note??null,
      createdAt: new Date(),
    };
    checkinsMap.set(c.id, c);
  }
}

export function demoRecentCheckins(profileId: string, days: number, todayStr: string): CheckinRow[] {
  const start = new Date(`${todayStr}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startIso = start.toISOString().slice(0,10);
  return [...checkinsMap.values()]
    .filter(c => c.profileId===profileId && c.day>=startIso && c.day<=todayStr)
    .sort((a,b) => a.day<b.day?-1:1);
}

// ---- Messages ----
export function demoListMessages(profileId: string, limit=50): AssistantMessageRow[] {
  return [...messagesMap.values()]
    .filter(m => m.profileId===profileId)
    .sort((a,b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .slice(-limit);
}

export function demoSaveMessage(profileId: string, role: string, content: string, origin: string): void {
  const m: AssistantMessageRow = {
    id: uid(), profileId, role, content, origin, createdAt: new Date(),
  };
  messagesMap.set(m.id, m);
}

export type GoalWithTasksDemo = GoalRow & { tasks: TaskRow[] };
export function demoGoalsWithTasks(profileId: string): GoalWithTasksDemo[] {
  const gs = demoListGoals(profileId);
  const ts = demoListTasks(profileId);
  return gs.map(g => ({ ...g, tasks: ts.filter(t => t.goalId===g.id) }));
}
