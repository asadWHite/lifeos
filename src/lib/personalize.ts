import type { User } from "@/db/schema";

/* Transparent, rule-based personalization. No fabricated "AI": these are
 * explicit, readable rules applied to the user's own onboarding answers. */

export function displayName(user: Pick<User, "name" | "nickname">): string {
  if (user.nickname && user.nickname.trim()) return user.nickname.trim();
  const first = (user.name || "").trim().split(/\s+/)[0];
  return first || "there";
}

export function greetingFor(user: Pick<User, "name" | "nickname">, minutesOfDay: number): string {
  const name = displayName(user);
  if (minutesOfDay < 5 * 60) return `Up late, ${name}?`;
  if (minutesOfDay < 12 * 60) return `Good morning, ${name}`;
  if (minutesOfDay < 17 * 60) return `Good afternoon, ${name}`;
  if (minutesOfDay < 22 * 60) return `Good evening, ${name}`;
  return `Winding down, ${name}?`;
}

/* Interest → default task categories surfaced in the UI. */
const INTEREST_TO_CATEGORY: Record<string, string[]> = {
  education: ["study", "personal"],
  languages: ["study"],
  health: ["health"],
  sleep: ["health"],
  productivity: ["work", "personal"],
  growth: ["personal"],
  work: ["work"],
  creative: ["creative"],
  social: ["social"],
  habits: ["personal", "health"],
};

export function suggestedCategories(interests: readonly string[]): string[] {
  const out = new Set<string>();
  for (const i of interests) for (const c of INTEREST_TO_CATEGORY[i] ?? []) out.add(c);
  if (out.size === 0) out.add("personal");
  return [...out];
}

/* Habit focus → suggested starter habits (only suggestions, never auto-created
 * with fake history). */
const HABIT_SUGGESTIONS: Record<string, { name: string; days: number[] }> = {
  sleep: { name: "Consistent bedtime", days: [0, 1, 2, 3, 4, 5, 6] },
  study: { name: "Focused study block", days: [1, 2, 3, 4, 5] },
  exercise: { name: "Move your body", days: [1, 3, 5] },
  reading: { name: "Read 20 minutes", days: [0, 1, 2, 3, 4, 5, 6] },
  planning: { name: "Plan tomorrow", days: [0, 1, 2, 3, 4, 5, 6] },
  less_phone: { name: "Phone-free evening", days: [0, 1, 2, 3, 4, 5, 6] },
  projects: { name: "Work on a personal project", days: [2, 4, 6] },
};

export function suggestedHabits(focus: readonly string[]): { name: string; days: number[] }[] {
  return focus.map((f) => HABIT_SUGGESTIONS[f]).filter(Boolean);
}

/* Sleep schedule defaults pulled from onboarding answers. */
export function sleepDefaults(user: Pick<User, "schedule">): { bedtime: string; wakeTime: string } {
  const wake = user.schedule?.wakeTime;
  const bed = user.schedule?.bedTime;
  return {
    bedtime: bed && /^\d{2}:\d{2}$/.test(bed) ? bed : "23:00",
    wakeTime: wake && /^\d{2}:\d{2}$/.test(wake) ? wake : "07:00",
  };
}

const SITUATION_LABEL: Record<string, string> = {
  school_student: "School student",
  university_student: "University student",
  working_adult: "Working adult",
  self_employed: "Self-employed",
  multiple: "Wearing many hats",
  other: "Carving your own path",
};

export function situationLabel(key: string | null | undefined): string | null {
  return key ? SITUATION_LABEL[key] ?? null : null;
}

/* A single honest, rule-based planning hint for the Today dashboard. */
export function planningHint(user: Pick<User, "planningStyle" | "schedule">, pendingCount: number): string {
  if (pendingCount === 0) {
    return user.planningStyle === "structured"
      ? "Your structured day is clear — a good moment to plan tomorrow."
      : "Nothing left on the books today. Enjoy the open time.";
  }
  if (user.planningStyle === "structured") {
    return `${pendingCount} ${pendingCount === 1 ? "activity" : "activities"} left. Follow the flow — one block at a time.`;
  }
  if (user.planningStyle === "flexible") {
    return `${pendingCount} open ${pendingCount === 1 ? "item" : "items"} — tackle whatever fits your energy.`;
  }
  return `${pendingCount} ${pendingCount === 1 ? "thing" : "things"} to go. Steady pace wins.`;
}
