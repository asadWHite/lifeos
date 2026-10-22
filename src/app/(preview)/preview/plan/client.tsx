"use client";

import { DEMO_TASKS, DEMO_HABITS, DEMO_GOALS, DEMO_USER, TODAY } from "@/lib/demo-data";
import { suggestedCategories, suggestedHabits } from "@/lib/personalize";
import { PlanModule } from "@/components/plan-module";

export function PreviewPlan() {
  return (
    <PlanModule
      today={TODAY}
      tasks={DEMO_TASKS}
      habits={DEMO_HABITS}
      goals={DEMO_GOALS}
      goalOptions={DEMO_GOALS.filter((g) => g.status === "active").map((g) => ({ id: g.id, title: g.title }))}
      suggestedCategories={suggestedCategories(DEMO_USER.interests)}
      habitSuggestions={suggestedHabits(DEMO_USER.habitFocus)}
    />
  );
}
