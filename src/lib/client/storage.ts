"use client";

import { useEffect, useState } from "react";
import type { ProfileRow, PreferencesRow, TaskRow, GoalRow, SleepSessionRow, CheckinRow, AssistantMessageRow } from "@/db/schema";

// Default empty preferences
function defaultPrefs(profileId: string): PreferencesRow {
  return {
    profileId, ageGroup: null, lifeStage: null, lifeStageOther: null,
    interests: [], interestsOther: null, objectives: [], objectivesOther: null,
    wakeTime: null, bedtime: null, commitments: null, personalTime: null,
    weekendVaries: null, planningStyle: null, difficulties: [],
    phoneBeforeBed: null, sleepTargetMinutes: null, hiddenSections: [],
    theme: "system", onboardingStep: 0, updatedAt: new Date(0),
  };
}

export const Storage = {
  // Utility
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    const v = localStorage.getItem(`lifeos_${key}`);
    return v ? JSON.parse(v) : fallback;
  },
  set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    localStorage.setItem(`lifeos_${key}`, JSON.stringify(value));
  },

  // Profiles
  getProfiles(): ProfileRow[] { return this.get("profiles", []); },
  getProfile(id: string): ProfileRow | null { return this.getProfiles().find(p => p.id === id) || null; },
  saveProfile(p: ProfileRow) {
    const list = this.getProfiles().filter(x => x.id !== p.id);
    this.set("profiles", [...list, p]);
  },
  deleteProfile(id: string) {
    this.set("profiles", this.getProfiles().filter(x => x.id !== id));
    this.set("prefs", this.get("prefs", [] as PreferencesRow[]).filter(x => x.profileId !== id));
    this.set("tasks", this.getTasks().filter(x => x.profileId !== id));
    this.set("goals", this.getGoals().filter(x => x.profileId !== id));
    this.set("sleep", this.getSleeps().filter(x => x.profileId !== id));
    this.set("checkins", this.getCheckins().filter(x => x.profileId !== id));
    this.set("messages", this.getMessages().filter(x => x.profileId !== id));
  },

  // Prefs
  getPrefs(profileId: string): PreferencesRow {
    const list = this.get<PreferencesRow[]>("prefs", []);
    return list.find(p => p.profileId === profileId) || defaultPrefs(profileId);
  },
  savePrefs(p: PreferencesRow) {
    const list = this.get<PreferencesRow[]>("prefs", []).filter(x => x.profileId !== p.profileId);
    this.set("prefs", [...list, p]);
  },

  // Tasks
  getTasks(): TaskRow[] { return this.get("tasks", []); },
  saveTask(t: TaskRow) {
    const list = this.getTasks().filter(x => x.id !== t.id);
    this.set("tasks", [...list, t]);
  },
  deleteTask(id: string) {
    this.set("tasks", this.getTasks().filter(x => x.id !== id));
  },

  // Goals
  getGoals(): GoalRow[] { return this.get("goals", []); },
  saveGoal(g: GoalRow) {
    const list = this.getGoals().filter(x => x.id !== g.id);
    this.set("goals", [...list, g]);
  },
  deleteGoal(id: string) {
    this.set("goals", this.getGoals().filter(x => x.id !== id));
  },

  // Sleep
  getSleeps(): SleepSessionRow[] { return this.get("sleep", []); },
  saveSleep(s: SleepSessionRow) {
    const list = this.getSleeps().filter(x => x.id !== s.id);
    this.set("sleep", [...list, s]);
  },
  deleteSleep(id: string) {
    this.set("sleep", this.getSleeps().filter(x => x.id !== id));
  },

  // Checkins
  getCheckins(): CheckinRow[] { return this.get("checkins", []); },
  saveCheckin(c: CheckinRow) {
    const list = this.getCheckins().filter(x => x.id !== c.id);
    this.set("checkins", [...list, c]);
  },

  // Messages
  getMessages(): AssistantMessageRow[] { return this.get("messages", []); },
  saveMessage(m: AssistantMessageRow) {
    const list = this.getMessages().filter(x => x.id !== m.id);
    this.set("messages", [...list, m]);
  },
  
  // Current Session
  getCurrentProfileId(): string | null {
    // Read from cookie for simple sync
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )lifeos_profile=([^;]+)'));
    return match ? match[2] : null;
  },
  setCurrentProfileId(id: string | null) {
    if (typeof document === "undefined") return;
    if (id) {
      document.cookie = `lifeos_profile=${id}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = `lifeos_profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
};

/** React Hook for client-side data fetching */
export function useStore() {
  const [mounted, setMounted] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setProfileId(Storage.getCurrentProfileId());
  }, []);

  return { mounted, profileId, Storage };
}

export function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15);
}
