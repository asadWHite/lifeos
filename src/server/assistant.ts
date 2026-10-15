import "server-only";
import { db } from "@/db";
import { assistantMessages } from "@/db/schema";
import * as demo from "@/server/demo";
import type { SessionContext } from "@/server/session";
import {
  getCheckin,
  listGoalsWithTasks,
  listSleepSessions,
  listTasks,
} from "@/server/data";
import type { AssistantContext } from "@/lib/assistant";
import { computeGoalProgress } from "@/lib/goals";
import {
  bedtimeForWake,
  guidanceForAge,
  weeklySleepStats,
  type AgeGroup,
} from "@/lib/sleep";
import { labelFor, INTERESTS, LIFE_STAGES, OBJECTIVES } from "@/lib/onboarding";
import { addDaysIso, dayPartsInTz, todayInTz } from "@/lib/time";

/**
 * Builds the *minimum necessary* context for the assistant:
 * today's tasks, goal progress, recent sleep aggregates, and explicit
 * preferences. No raw message history or unrelated rows are included, so we
 * never overshare personal data with an external model.
 */
export async function buildAssistantContext(session: SessionContext): Promise<AssistantContext> {
  const { profile, prefs } = session;
  const tz = profile.timezone;
  const today = todayInTz(tz);

  const [all, goalRows, sleep, checkin] = await Promise.all([
    listTasks(profile.id),
    listGoalsWithTasks(profile.id),
    listSleepSessions(profile.id, 30),
    getCheckin(profile.id, today),
  ]);

  const todayTasks = all.filter((t) => t.dueDate === today).slice(0, 12);
  const overdueCount = all.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today).length;

  const sleepStats = weeklySleepStats(
    sleep,
    (d) => ({
      minutesAfterMidnight: dayPartsInTz(tz, d).hour * 60 + dayPartsInTz(tz, d).minute,
      dateIso: dayPartsInTz(tz, d).iso,
    }),
    today,
  );

  const lastCompleted = sleep[0];
  const target = prefs.sleepTargetMinutes;

  const bedtime =
    prefs.bedtime ?? (prefs.wakeTime && target ? bedtimeForWake(prefs.wakeTime, target) : null);

  return {
    name: profile.name.split(" ")[0],
    lifeStageLabel: labelFor(LIFE_STAGES, prefs.lifeStage),
    objectiveLabels: prefs.objectives.map((o) => labelFor(OBJECTIVES, o) ?? o),
    interestLabels: prefs.interests.map((i) => labelFor(INTERESTS, i) ?? i),
    sleepTargetMinutes: target,
    bedtime,
    wakeTime: prefs.wakeTime,
    today: todayTasks.map((t) => ({
      title: t.title,
      done: t.status === "done",
      priority: t.priority,
      durationMinutes: t.durationMinutes,
    })),
    overdueCount,
    tomorrowCount: all.filter((t) => t.dueDate === addDaysIso(today, 1)).length,
    goals: goalRows
      .filter((g) => g.status === "active")
      .slice(0, 5)
      .map((g) => {
        const progress = computeGoalProgress(g, g.tasks);
        return { title: g.title, percent: progress.percent, explanation: progress.explanation };
      }),
    lastSleepMinutes: lastCompleted?.durationMinutes ?? null,
    weekSleepAverage: sleepStats.averageMinutes,
    energy: checkin?.energy ?? null,
  };
}

export async function saveAssistantMessage(
  profileId: string,
  role: "user" | "assistant",
  content: string,
  origin: "ai" | "rules",
): Promise<void> {
  if (demo.isDemoMode()) {
    demo.demoSaveMessage(profileId, role, content, origin);
    return;
  }
  await db.insert(assistantMessages).values({ profileId, role, content, origin });
}

/** Age guidance line used by the AI prompt and the brain page. */
export function sleepGuidanceLine(ageGroup: string | null): string {
  const g = guidanceForAge((ageGroup as AgeGroup) ?? null);
  return `${g.label} is the commonly referenced range for this age group`;
}
