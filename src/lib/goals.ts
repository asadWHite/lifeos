/**
 * Goal progress — computed only from real data:
 *  1. an explicit measurable target the user configured, or
 *  2. completion of real linked tasks.
 * Never invented percentages.
 */

export type TaskLike = { status: string };

export type GoalLike = {
  metricTarget: number | null;
  metricProgress: number;
  metricUnit: string | null;
};

export type GoalProgress = {
  kind: "metric" | "tasks" | "none";
  /** 0-100, or null when there is nothing measurable yet */
  percent: number | null;
  /** User-facing explanation of *how* progress is computed */
  explanation: string;
  doneUnits: number;
  totalUnits: number;
};

export function computeGoalProgress(goal: GoalLike, linkedTasks: TaskLike[]): GoalProgress {
  if (goal.metricTarget != null && goal.metricTarget > 0) {
    const percent = Math.min(100, Math.round((goal.metricProgress / goal.metricTarget) * 100));
    const unit = goal.metricUnit?.trim() || "steps";
    return {
      kind: "metric",
      percent,
      explanation: `${goal.metricProgress} of ${goal.metricTarget} ${unit} logged`,
      doneUnits: goal.metricProgress,
      totalUnits: goal.metricTarget,
    };
  }
  const total = linkedTasks.length;
  if (total > 0) {
    const done = linkedTasks.filter((t) => t.status === "done").length;
    return {
      kind: "tasks",
      percent: Math.round((done / total) * 100),
      explanation: `${done} of ${total} linked tasks completed`,
      doneUnits: done,
      totalUnits: total,
    };
  }
  return {
    kind: "none",
    percent: null,
    explanation: "No measurable progress yet — link tasks or set a measurable target.",
    doneUnits: 0,
    totalUnits: 0,
  };
}

export const GOAL_CATEGORIES = [
  { id: "learning", label: "Learning & skills" },
  { id: "career", label: "Career & work" },
  { id: "health", label: "Health & well-being" },
  { id: "personal", label: "Personal life" },
  { id: "finance", label: "Finance" },
  { id: "creative", label: "Creative projects" },
  { id: "other", label: "Other" },
] as const;

export function categoryLabel(id: string | null | undefined): string {
  return GOAL_CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}
