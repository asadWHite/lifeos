"use client";

import { DEMO_TASKS, DEMO_HABITS, DEMO_ACHIEVEMENTS, DEMO_CHALLENGES, DEMO_WEEK_SERIES, TODAY } from "@/lib/demo-data";
import { ProgressModule } from "@/components/progress-module";
import { summarizeToday } from "@/lib/stats";

export function PreviewProgress() {
  const [y, m] = TODAY.split("-").map(Number);
  const todaySummary = summarizeToday(DEMO_TASKS, TODAY);

  return (
    <ProgressModule
      today={TODAY}
      currentYear={y}
      currentMonth={m}
      todaySummary={todaySummary}
      week={DEMO_WEEK_SERIES}
      taskStreak={5}
      taskBest={12}
      habitStats={DEMO_HABITS.map((h) => ({
        id: h.habit.id,
        name: h.habit.name,
        scheduled: 14,
        completed: h.totalCompletions > 14 ? 14 : h.totalCompletions,
        pct: Math.round((Math.min(h.totalCompletions, 14) / 14) * 100),
      }))}
      sleep={{ avg: 430, statuses: { green: 4, yellow: 1, red: 2 }, hasSchedule: true }}
      achievements={DEMO_ACHIEVEMENTS}
      challenges={DEMO_CHALLENGES}
    />
  );
}
