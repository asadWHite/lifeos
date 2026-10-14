/**
 * Personalization engine — explicit, readable rules only.
 *
 * Everything here is deterministic, derived directly from onboarding answers,
 * and remains fully editable by the user. No inferred personality trait is
 * ever stored, and rules are kept separate from UI components.
 */

import { guidanceForAge, type AgeGroup } from "./sleep";
import {
  labelFor,
  AGE_GROUPS,
  DIFFICULTIES,
  INTERESTS,
  LIFE_STAGES,
  OBJECTIVES,
  PHONE_USE,
  PLANNING_STYLES,
} from "./onboarding";

export type PersonalizationInput = {
  ageGroup: string | null;
  lifeStage: string | null;
  interests: string[];
  objectives: string[];
  planningStyle: string | null;
  difficulties: string[];
  personalTime: string | null;
  sleepTargetMinutes: number | null;
};

export type StarterTask = {
  title: string;
  priority: "low" | "normal" | "high";
  durationMinutes: number | null;
};

export type DashboardConfig = {
  /** Sections are hidden by user preference, ordered by these priorities */
  emphasizeSleep: boolean;
  emphasizeRoutines: boolean;
  /** Concise bullet points describing what LIFEOS configured and why */
  insights: string[];
  /** Personalized assistant quick-prompts for the Brain screen */
  quickPrompts: string[];
  starterTasks: StarterTask[];
  suggestedGoal: { title: string; description: string; category: string } | null;
};

const OBJECTIVE_STARTER_TASKS: Record<string, StarterTask> = {
  time_management: {
    title: "Pick tomorrow's top 3 priorities",
    priority: "normal",
    durationMinutes: 10,
  },
  skills: {
    title: "Practice a skill for 25 minutes",
    priority: "normal",
    durationMinutes: 25,
  },
  academic: {
    title: "Complete one focused study session",
    priority: "high",
    durationMinutes: 40,
  },
  professional: {
    title: "Spend 30 minutes on professional development",
    priority: "normal",
    durationMinutes: 30,
  },
  projects: {
    title: "Work on a personal project",
    priority: "normal",
    durationMinutes: 30,
  },
  sleep: {
    title: "Start winding down 30 minutes before bed",
    priority: "normal",
    durationMinutes: 30,
  },
  activity: {
    title: "Get 20 minutes of physical activity",
    priority: "normal",
    durationMinutes: 20,
  },
  routines: {
    title: "Do a short morning routine right after waking",
    priority: "normal",
    durationMinutes: 15,
  },
  responsibilities: {
    title: "List today's three most important tasks",
    priority: "normal",
    durationMinutes: 5,
  },
};

const OBJECTIVE_GOALS: Record<string, { title: string; description: string; category: string }> = {
  sleep: {
    title: "Build a consistent sleep routine",
    description: "Set a target bedtime and wake time, then track your sleep to see how the routine develops.",
    category: "health",
  },
  skills: {
    title: "Learn a new skill",
    description: "Break the skill into small practice sessions and track your progress here.",
    category: "learning",
  },
  academic: {
    title: "Strengthen my academic results",
    description: "Plan regular study sessions and track them as tasks linked to this goal.",
    category: "learning",
  },
  professional: {
    title: "Grow professionally",
    description: "Reserve recurring time for development and keep the momentum visible.",
    category: "career",
  },
  projects: {
    title: "Ship a personal project",
    description: "Break your project into small, completable tasks and track them here.",
    category: "creative",
  },
  activity: {
    title: "Move my body more often",
    description: "Schedule small activity sessions and log your weekly minutes in Health.",
    category: "health",
  },
  time_management: {
    title: "Take control of my time",
    description: "Use LIFEOS daily planning to decide what matters before the day starts.",
    category: "personal",
  },
  routines: {
    title: "Establish a daily routine",
    description: "Anchor a few small habits to fixed points in your day.",
    category: "personal",
  },
  responsibilities: {
    title: "Stay on top of daily responsibilities",
    description: "Keep responsibilities as visible, prioritized tasks instead of mental load.",
    category: "personal",
  },
};

/** How many starter tasks to generate based on planning preference. */
function planSize(planningStyle: string | null): number {
  if (planningStyle === "independent") return 1;
  if (planningStyle === "full_plan") return 3;
  return 2; // "together" or unset
}

export function personalize(input: PersonalizationInput): DashboardConfig {
  const insights: string[] = [];
  const starterTasks: StarterTask[] = [];
  const quickPrompts: string[] = [];

  const objectives = input.objectives.filter((o) => o !== "other");

  // Starter plan from objectives, ordered, respecting planning style.
  for (const objective of objectives.slice(0, planSize(input.planningStyle))) {
    const task = OBJECTIVE_STARTER_TASKS[objective];
    if (task) starterTasks.push({ ...task });
  }
  if (starterTasks.length === 0) {
    starterTasks.push({
      title: "Take 5 minutes to plan today",
      priority: "normal",
      durationMinutes: 5,
    });
  }

  if (input.planningStyle === "independent") {
    insights.push("You prefer planning independently, so LIFEOS keeps suggestions minimal — assistant help is available whenever you ask.");
  } else if (input.planningStyle === "full_plan") {
    insights.push("LIFEOS will draft fuller daily plans for you to adjust — everything stays editable.");
  } else {
    insights.push("LIFEOS will suggest a light daily plan you can refine.");
  }

  // Sleep emphasis.
  const wantsSleep = input.objectives.includes("sleep");
  const guidance = guidanceForAge((input.ageGroup as AgeGroup) ?? null);
  if (wantsSleep) {
    insights.push(`Sleep is one of your objectives, so sleep tracking appears prominently. A reasonable target for your age group is usually ${guidance.label} — adjustable anytime; this is general guidance, not medical advice.`);
  } else {
    insights.push(`Sleep guidance for your age group is typically ${guidance.label}; nothing here is medical advice.`);
  }

  // Suggested goal: first mapped objective.
  let suggestedGoal: DashboardConfig["suggestedGoal"] = null;
  for (const objective of objectives) {
    if (OBJECTIVE_GOALS[objective]) {
      suggestedGoal = { ...OBJECTIVE_GOALS[objective] };
      insights.push(`A starter goal “${suggestedGoal.title}” was created from your objectives — edit or remove it freely.`);
      break;
    }
  }

  // Life-stage flavor for prompts (gentle, non-stereotyping).
  const stageLabel = labelFor(LIFE_STAGES, input.lifeStage);
  if (stageLabel && input.lifeStage !== "other") {
    insights.push(`Your dashboard is tuned for someone who is “${stageLabel.toLowerCase()}” — adjust sections anytime in Settings.`);
  }

  const interestLabels = input.interests
    .filter((i) => i !== "other")
    .map((i) => labelFor(INTERESTS, i))
    .filter(Boolean) as string[];

  quickPrompts.push("Plan my day");
  if (input.lifeStage === "school" || input.lifeStage === "university") {
    quickPrompts.push("Help me schedule study time");
  }
  if (wantsSleep) quickPrompts.push("How has my sleep been this week?");
  if (interestLabels.length > 0) {
    quickPrompts.push(`Suggest time for ${interestLabels[0].toLowerCase()}`);
  }
  quickPrompts.push("Summarize my progress");

  return {
    emphasizeSleep: wantsSleep,
    emphasizeRoutines:
      input.objectives.includes("routines") || input.difficulties.includes("routines"),
    insights,
    quickPrompts: quickPrompts.slice(0, 4),
    starterTasks,
    suggestedGoal,
  };
}

export type MemoryInput = {
  ageGroup: string | null;
  lifeStage: string | null;
  lifeStageOther: string | null;
  interests: string[];
  interestsOther: string | null;
  objectives: string[];
  objectivesOther: string | null;
  wakeTime: string | null;
  bedtime: string | null;
  planningStyle: string | null;
  difficulties: string[];
  phoneBeforeBed: string | null;
  weekendVaries: boolean | null;
};

/**
 * Human-readable recap of the explicit personalization data LIFEOS stores.
 * Everything listed here is user-editable; nothing is inferred silently.
 */
export function memoryFacts(input: MemoryInput): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: string | null) => {
    if (value) facts.push({ label, value });
  };

  push("Age group", labelFor(AGE_GROUPS, input.ageGroup));
  const stage = labelFor(LIFE_STAGES, input.lifeStage);
  push(
    "Life stage",
    input.lifeStage === "other" && input.lifeStageOther?.trim()
      ? input.lifeStageOther.trim()
      : stage,
  );
  const interests = input.interests
    .map((i) => (i === "other" ? input.interestsOther?.trim() || null : labelFor(INTERESTS, i)))
    .filter(Boolean) as string[];
  push("Interests", interests.length ? interests.join(", ") : null);
  const objectives = input.objectives
    .map((i) => (i === "other" ? input.objectivesOther?.trim() || null : labelFor(OBJECTIVES, i)))
    .filter(Boolean) as string[];
  push("Objectives", objectives.length ? objectives.join(", ") : null);
  push("Planning style", labelFor(PLANNING_STYLES, input.planningStyle));
  if (input.wakeTime) push("Typical wake-up", input.wakeTime);
  if (input.bedtime) push("Typical bedtime", input.bedtime);
  if (input.wakeTime || input.bedtime) {
    push("Weekends", input.weekendVaries ? "Schedule varies on weekends" : "Similar on weekends");
  }
  const difficulties = input.difficulties
    .filter((d) => d !== "none")
    .map((d) => labelFor(DIFFICULTIES, d))
    .filter(Boolean) as string[];
  push("Asks for help with", difficulties.length ? difficulties.join(", ") : null);
  push("Phone before bed", labelFor(PHONE_USE, input.phoneBeforeBed));
  return facts;
}
