"use client";

import { DEMO_TASKS, DEMO_HABITS, DEMO_COMPLETED_HABIT_IDS, DEMO_GOALS, DEMO_SLEEP_SCHEDULE, DEMO_SLEEP_ROWS, DEMO_USER, TODAY, TZ, NOW_MIN } from "@/lib/demo-data";
import { greetingFor, planningHint, suggestedCategories } from "@/lib/personalize";
import { TodayDashboard } from "@/components/today-dashboard";

export function PreviewToday() {
  const todayTasks = DEMO_TASKS.filter((t) => t.date === TODAY);
  const pending = todayTasks.filter((t) => t.status !== "completed").length;
  const lastSleep = DEMO_SLEEP_ROWS[0];

  return (
    <TodayDashboard
      today={TODAY}
      timezone={TZ}
      nowMin={NOW_MIN}
      greeting={greetingFor(DEMO_USER, NOW_MIN)}
      hint={planningHint(DEMO_USER, pending)}
      tasks={todayTasks}
      habits={DEMO_HABITS.map((h) => h.habit)}
      completedHabitIds={DEMO_COMPLETED_HABIT_IDS}
      activeSleep={null}
      schedule={DEMO_SLEEP_SCHEDULE}
      lastSleepSummary={lastSleep ? { durationLabel: `${Math.floor((lastSleep.durationMin ?? 0) / 60)}h ${String((lastSleep.durationMin ?? 0) % 60).padStart(2, "0")}m`, status: lastSleep.status, wakeLabel: lastSleep.endLabel ?? "" } : null}
      goals={DEMO_GOALS.map((g) => ({ id: g.id, title: g.title }))}
      suggestedCategories={suggestedCategories(DEMO_USER.interests)}
    />
  );
}
