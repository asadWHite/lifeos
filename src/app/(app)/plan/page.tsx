import type { Metadata } from "next";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { goals, habitCompletions, habits as habitsTable, tasks } from "@/db/schema";
import { addDays, todayInTz, weekdayOf } from "@/lib/dates";
import { currentHabitStreak, longestHabitStreak } from "@/lib/streaks";
import { suggestedCategories, suggestedHabits } from "@/lib/personalize";
import { toGoalDTO, toHabitDTO, toTaskDTO } from "@/lib/dto";
import type { HabitDTO, GoalDTO } from "@/lib/dto";
import { PlanModule, type HabitView } from "@/components/plan-module";

export const metadata: Metadata = { title: "Plan" };
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const tz = user.timezone;
  const today = todayInTz(tz);
  const from = addDays(today, -35);

  const [taskRows, habitRows, completionRows, goalRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, user.id)).orderBy(asc(tasks.date), asc(tasks.startTime)).limit(800),
    db.select().from(habitsTable).where(eq(habitsTable.userId, user.id)).orderBy(asc(habitsTable.createdAt)),
    db.select().from(habitCompletions).where(and(gte(habitCompletions.date, from), eq(habitCompletions.userId, user.id))),
    db.select().from(goals).where(eq(goals.userId, user.id)).orderBy(desc(goals.createdAt)),
  ]);

  const habitViews: HabitView[] = habitRows.map((h: (typeof habitRows)[number]) => {
    const dates = new Set(completionRows.filter((c) => c.habitId === h.id).map((c) => c.date));
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6);
      return { date: d, scheduled: h.days.includes(weekdayOf(d)), done: dates.has(d) };
    });
    return {
      habit: toHabitDTO(h) as HabitDTO,
      current: currentHabitStreak(dates, h.days, today),
      longest: longestHabitStreak(dates, h.days, today),
      doneToday: dates.has(today),
      scheduledToday: h.days.includes(weekdayOf(today)),
      week,
      totalCompletions: completionRows.filter((c) => c.habitId === h.id).length,
    };
  });

  return (
    <PlanModule
      today={today}
      tasks={taskRows.map(toTaskDTO)}
      habits={habitViews}
      goals={goalRows.map(toGoalDTO) as GoalDTO[]}
      goalOptions={goalRows.filter((g) => g.status === "active").map((g) => ({ id: g.id, title: g.title }))}
      suggestedCategories={suggestedCategories(user.interests)}
      habitSuggestions={suggestedHabits(user.habitFocus)}
    />
  );
}
