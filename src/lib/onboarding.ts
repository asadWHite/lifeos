/**
 * Onboarding definition: steps, options, and validation.
 * Kept separate from UI so the contract can be shared with future clients.
 *
 * Privacy principle: only ask what is needed to personalize. These answers
 * are preferences, never diagnoses or psychological profiles.
 */

import { isValidTime } from "./time";

export const AGE_GROUPS = [
  { id: "u13", label: "Under 13" },
  { id: "a13_17", label: "13–17" },
  { id: "a18_24", label: "18–24" },
  { id: "a25_34", label: "25–34" },
  { id: "a35_49", label: "35–49" },
  { id: "a50_64", label: "50–64" },
  { id: "a65p", label: "65+" },
] as const;

export const LIFE_STAGES = [
  { id: "school", label: "School student" },
  { id: "university", label: "University or college student" },
  { id: "employed", label: "Employed" },
  { id: "entrepreneur", label: "Entrepreneur or business owner" },
  { id: "job_seeking", label: "Looking for work" },
  { id: "home_family", label: "Managing home or family" },
  { id: "retired", label: "Retired" },
  { id: "other", label: "Something else" },
] as const;

export const INTERESTS = [
  { id: "learning", label: "Education & learning" },
  { id: "technology", label: "Technology & programming" },
  { id: "business", label: "Business & finance" },
  { id: "fitness", label: "Fitness & physical activity" },
  { id: "creativity", label: "Creativity & design" },
  { id: "travel", label: "Travel" },
  { id: "growth", label: "Personal development" },
  { id: "family", label: "Family & social life" },
  { id: "entertainment", label: "Entertainment & gaming" },
  { id: "wellbeing", label: "Relaxation & well-being" },
  { id: "other", label: "Something else" },
] as const;

export const OBJECTIVES = [
  { id: "time_management", label: "Better time management" },
  { id: "skills", label: "Learning new skills" },
  { id: "academic", label: "Academic improvement" },
  { id: "professional", label: "Professional growth" },
  { id: "projects", label: "Building personal projects" },
  { id: "sleep", label: "Improving sleep habits" },
  { id: "activity", label: "Increasing physical activity" },
  { id: "routines", label: "Developing consistent routines" },
  { id: "responsibilities", label: "Managing daily responsibilities" },
  { id: "other", label: "Something else" },
] as const;

export const PLANNING_STYLES = [
  {
    id: "full_plan",
    label: "Let LIFEOS suggest a full plan",
    description: "LIFEOS drafts your day and you adjust it.",
  },
  {
    id: "together",
    label: "Build the plan together",
    description: "A balance — LIFEOS suggests, you refine.",
  },
  {
    id: "independent",
    label: "Plan independently",
    description: "You plan; LIFEOS helps only when asked.",
  },
] as const;

export const DIFFICULTIES = [
  { id: "starting", label: "Getting started" },
  { id: "focus", label: "Staying focused" },
  { id: "finishing", label: "Completing tasks" },
  { id: "time", label: "Managing time" },
  { id: "routines", label: "Maintaining routines" },
  { id: "balance", label: "Balancing responsibilities" },
  { id: "none", label: "None of these" },
  { id: "other", label: "Something else" },
] as const;

export const PHONE_USE = [
  { id: "rarely", label: "Rarely" },
  { id: "sometimes", label: "Sometimes" },
  { id: "often", label: "Often" },
  { id: "prefer_not", label: "Prefer not to say" },
] as const;

export const COMMITMENTS = [
  { id: "school", label: "School takes most weekdays" },
  { id: "work", label: "Work takes most weekdays" },
  { id: "mixed", label: "A mix that varies week to week" },
  { id: "flexible", label: "My days are mostly flexible" },
] as const;

export const PERSONAL_TIME = [
  { id: "morning", label: "Mornings" },
  { id: "afternoon", label: "Afternoons" },
  { id: "evening", label: "Evenings" },
  { id: "varies", label: "It varies" },
] as const;

export type OptionSet<T extends ReadonlyArray<{ id: string; label: string }>> =
  T[number]["id"];

export type AgeGroupId = OptionSet<typeof AGE_GROUPS>;
export type LifeStageId = OptionSet<typeof LIFE_STAGES>;
export type PlanningStyleId = OptionSet<typeof PLANNING_STYLES>;

export type OnboardingValues = {
  ageGroup: string | null;
  lifeStage: string | null;
  lifeStageOther: string;
  interests: string[];
  interestsOther: string;
  objectives: string[];
  objectivesOther: string;
  wakeTime: string | null;
  bedtime: string | null;
  commitments: string | null;
  personalTime: string | null;
  weekendVaries: boolean | null;
  planningStyle: string | null;
  difficulties: string[];
  phoneBeforeBed: string | null;
};

export const EMPTY_VALUES: OnboardingValues = {
  ageGroup: null,
  lifeStage: null,
  lifeStageOther: "",
  interests: [],
  interestsOther: "",
  objectives: [],
  objectivesOther: "",
  wakeTime: null,
  bedtime: null,
  commitments: null,
  personalTime: null,
  weekendVaries: null,
  planningStyle: null,
  difficulties: [],
  phoneBeforeBed: null,
};

export type StepId =
  | "age"
  | "stage"
  | "interests"
  | "objectives"
  | "schedule"
  | "planning"
  | "difficulties"
  | "phone";

export const STEPS: Array<{ id: StepId; skippable: boolean; title: string; subtitle: string }> = [
  { id: "age", skippable: false, title: "Which age group are you in?", subtitle: "This tunes recommendations like sleep guidance. No birth date needed." },
  { id: "stage", skippable: false, title: "What best describes your life right now?", subtitle: "LIFEOS adapts suggestions to your situation." },
  { id: "interests", skippable: true, title: "What are you interested in?", subtitle: "Pick as many as you like — they shape suggestions." },
  { id: "objectives", skippable: true, title: "What would you like LIFEOS to help with?", subtitle: "Choose your main objectives." },
  { id: "schedule", skippable: true, title: "What does a typical day look like?", subtitle: "Approximate is fine — you can change this anytime." },
  { id: "planning", skippable: true, title: "How much planning help do you want?", subtitle: "You can change this later in Settings." },
  { id: "difficulties", skippable: true, title: "Anything you'd like help with?", subtitle: "For personalization only — not a diagnosis or judgement." },
  { id: "phone", skippable: true, title: "Do you usually use your phone before sleep?", subtitle: "Optional. Used only to suggest a wind-down routine." },
];

export const TOTAL_QUESTION_STEPS = STEPS.length;

/** Validate a step. Returns an error string, or null when acceptable. */
export function validateStep(step: number, values: OnboardingValues): string | null {
  const def = STEPS[step];
  if (!def) return null;
  switch (def.id) {
    case "age":
      if (!values.ageGroup) return "Please choose your age group to continue.";
      break;
    case "stage": {
      if (!values.lifeStage) return "Please choose the option that fits you best.";
      if (values.lifeStage === "other" && values.lifeStageOther.trim().length > 120)
        return "Please keep the description under 120 characters.";
      break;
    }
    case "schedule": {
      if (values.wakeTime && !isValidTime(values.wakeTime)) return "Wake-up time looks invalid.";
      if (values.bedtime && !isValidTime(values.bedtime)) return "Bedtime looks invalid.";
      break;
    }
    default:
      break;
  }
  return null;
}

/** "None of these" is exclusive inside the difficulties multi-select. */
export function toggleDifficulty(current: string[], id: string): string[] {
  if (id === "none") return current.includes("none") ? [] : ["none"];
  const without = current.filter((d) => d !== "none");
  return without.includes(id) ? without.filter((d) => d !== id) : [...without, id];
}

export function toggleMulti(current: string[], id: string): string[] {
  return current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
}

export function labelFor(
  set: ReadonlyArray<{ id: string; label: string }>,
  id: string | null,
): string | null {
  if (!id) return null;
  return set.find((o) => o.id === id)?.label ?? null;
}
