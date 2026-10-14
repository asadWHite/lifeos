import { ChartColumn, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { requireOnboarded } from "@/server/session";
import {
  listGoalsWithTasks,
  listSleepSessions,
  listTasks,
  recentCheckins,
  tasksCompletedSince,
} from "@/server/data";
import { computeGoalProgress } from "@/lib/goals";
import { statusForSession, STATUS_COPY, weeklySleepStats } from "@/lib/sleep";
import {
  addDaysIso,
  dayPartsInTz,
  formatDayShort,
  formatDuration,
  lastNDays,
  todayInTz,
} from "@/lib/time";
import { EmptyState, ProgressBar, SectionHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await requireOnboarded();
  const { profile, prefs } = session;
  const tz = profile.timezone;
  const today = todayInTz(tz);
  const target = prefs.sleepTargetMinutes;

  const [completed, allTasks, goalRows, sessions, checkins] = await Promise.all([
    tasksCompletedSince(profile.id, addDaysIso(today, -6)),
    listTasks(profile.id),
    listGoalsWithTasks(profile.id),
    listSleepSessions(profile.id, 30),
    recentCheckins(profile.id, 7, today),
  ]);

  const toLocal = (d: Date) => {
    const p = dayPartsInTz(tz, d);
    return { minutesAfterMidnight: p.hour * 60 + p.minute, dateIso: p.iso };
  };

  // Tasks per day (by completion timestamp in profile tz)
  const week = lastNDays(tz, 7);
  const perDay: Record<string, number> = Object.fromEntries(week.map((d) => [d, 0]));
  for (const t of completed) {
    if (!t.completedAt) continue;
    const iso = dayPartsInTz(tz, new Date(t.completedAt)).iso;
    if (iso in perDay) perDay[iso] += 1;
  }
  const maxTasks = Math.max(1, ...Object.values(perDay));
  const weekTotal = completed.length;

  // Sleep
  const sleepStats = weeklySleepStats(sessions, toLocal, today);
  const delta =
    sleepStats.averageMinutes != null && sleepStats.prevAverageMinutes != null
      ? sleepStats.averageMinutes - sleepStats.prevAverageMinutes
      : null;

  // Goals
  const activeGoals = goalRows
    .filter((g) => g.status === "active")
    .map((g) => ({ title: g.title, progress: computeGoalProgress(g, g.tasks) }));
  const measurable = activeGoals.filter((g) => g.progress.percent != null);
  const avgGoalPercent =
    measurable.length > 0
      ? Math.round(measurable.reduce((a, g) => a + (g.progress.percent ?? 0), 0) / measurable.length)
      : null;

  // Energy pattern
  const energyCounts = { energized: 0, okay: 0, tired: 0 };
  for (const c of checkins) {
    if (c.energy && c.energy in energyCounts) energyCounts[c.energy as keyof typeof energyCounts] += 1;
  }
  const checkinDays = checkins.filter((c) => c.energy).length;
  const activityTotal = checkins.reduce((a, c) => a + (c.activityMinutes ?? 0), 0);

  const openTasks = allTasks.filter((t) => t.status !== "done").length;
  const hasAnyData =
    weekTotal > 0 || sleepStats.nightsTracked > 0 || activeGoals.length > 0 || checkinDays > 0;

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Progress</h1>
        <p className="mt-1 text-[14px] text-ink2">
          The last 7 days — computed only from data you&rsquo;ve actually recorded.
        </p>
      </header>

      {!hasAnyData ? (
        <div className="card mt-7">
          <EmptyState
            icon={<ChartColumn size={20} strokeWidth={1.8} />}
            title="Nothing to measure yet"
            body={
              openTasks > 0
                ? "Complete a task, track one night of sleep, or check in on Health — your trends will appear here."
                : "Add a task on Home, track a night of sleep, or check in on Health — your trends will appear here."
            }
          />
        </div>
      ) : (
        <>
          {/* Stat row */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="card p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Tasks done</p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">{weekTotal}</p>
              <p className="text-[12px] text-ink3">this week · {openTasks} open</p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Sleep average</p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">
                {sleepStats.averageMinutes != null ? formatDuration(sleepStats.averageMinutes) : "—"}
              </p>
              <p className="flex items-center gap-1 text-[12px] text-ink3">
                {delta == null ? (
                  "need prior week to compare"
                ) : (
                  <>
                    {delta > 0 ? (
                      <TrendingUp size={12} className="text-accent" />
                    ) : delta < 0 ? (
                      <TrendingDown size={12} className="text-amber" />
                    ) : (
                      <Minus size={12} />
                    )}
                    {delta === 0 ? "same as last week" : `${delta > 0 ? "+" : ""}${formatDuration(delta)} vs last week`}
                  </>
                )}
              </p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Goals active</p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">{activeGoals.length}</p>
              <p className="text-[12px] text-ink3">
                {avgGoalPercent != null ? `avg ${avgGoalPercent}% where measurable` : "add targets to measure"}
              </p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Activity</p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">
                {activityTotal > 0 ? `${activityTotal}m` : "—"}
              </p>
              <p className="text-[12px] text-ink3">
                {checkinDays > 0 ? `${checkinDays} check-in${checkinDays === 1 ? "" : "s"} this week` : "no check-ins yet"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* Tasks chart */}
            <section className="card p-5 sm:p-6" aria-label="Tasks completed per day">
              <SectionHeader title="Tasks completed" subtitle="Per day, last 7 days" />
              {weekTotal === 0 ? (
                <p className="mt-4 text-[13.5px] text-ink2">
                  No tasks completed this week. Your daily completion bars will show up here as you finish tasks.
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3" role="img" aria-label={`Tasks completed per day, ${weekTotal} total this week`}>
                  {week.map((iso) => {
                    const count = perDay[iso];
                    return (
                      <div key={iso} className="flex flex-col items-center gap-1.5">
                        <div className="flex h-24 w-full items-end justify-center">
                          <div
                            className={`w-full max-w-7 rounded-md ${count > 0 ? "bg-accent" : "bg-line"}`}
                            style={{ height: count > 0 ? Math.max(8, (count / maxTasks) * 96) : 4 }}
                            title={`${formatDayShort(iso)}: ${count} task${count === 1 ? "" : "s"}`}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-ink3">{formatDayShort(iso)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Sleep trend */}
            <section className="card p-5 sm:p-6" aria-label="Sleep trend">
              <SectionHeader
                title="Sleep trend"
                subtitle={target ? `Compared with your ${formatDuration(target)} target` : "Set a target in Settings to compare"}
              />
              {sleepStats.nightsTracked === 0 ? (
                <p className="mt-4 text-[13.5px] text-ink2">
                  No nights tracked this week. Start sleep tracking from Home or Health to see the trend.
                </p>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3" role="img" aria-label="Sleep duration per night">
                    {week.map((iso) => {
                      const s = sessions.find((x) => dayPartsInTz(tz, new Date(x.startedAt)).iso === iso);
                      const status = s?.durationMinutes != null ? statusForSession(s.durationMinutes, target) : null;
                      const tone =
                        s?.durationMinutes == null
                          ? "bg-line"
                          : status == null
                            ? "bg-line-strong"
                            : STATUS_COPY[status].tone === "green"
                              ? "bg-accent"
                              : STATUS_COPY[status].tone === "amber"
                                ? "bg-amber"
                                : "bg-red";
                      const max = Math.max(target ?? 480, ...[0, ...sessions.map((x) => x.durationMinutes ?? 0)]) * 1.1;
                      const h = s?.durationMinutes != null ? Math.max(8, (s.durationMinutes / max) * 96) : 4;
                      return (
                        <div key={iso} className="flex flex-col items-center gap-1.5">
                          <div className="flex h-24 w-full items-end justify-center">
                            <div
                              className={`w-full max-w-7 rounded-md ${tone}`}
                              style={{ height: h }}
                              title={s?.durationMinutes != null ? `${formatDayShort(iso)}: ${formatDuration(s.durationMinutes)}` : "Not tracked"}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-ink3">{formatDayShort(iso)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-[11.5px] leading-relaxed text-ink3">
                    Colors compare duration with your target only — they don&rsquo;t measure sleep quality.
                    {sleepStats.bedtimeConsistency != null && (
                      <> Bedtime varies by about ±{sleepStats.bedtimeConsistency} minutes across tracked nights.</>
                    )}
                  </p>
                </>
              )}
            </section>
          </div>

          {/* Goals + energy */}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="card p-5 sm:p-6" aria-label="Goal progress">
              <SectionHeader title="Goals" subtitle="Real progress from tasks and targets" />
              <div className="mt-4 space-y-4">
                {activeGoals.length === 0 ? (
                  <p className="text-[13.5px] text-ink2">
                    No active goals. Create one on the Goals page and it will be tracked here.
                  </p>
                ) : (
                  activeGoals.map((g) => (
                    <div key={g.title}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[14px] font-semibold text-ink">{g.title}</p>
                        {g.progress.percent != null && (
                          <span className="text-[13px] font-bold text-accent-ink">{g.progress.percent}%</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <ProgressBar percent={g.progress.percent} height={5} />
                      </div>
                      <p className="mt-1 text-[11.5px] text-ink3">{g.progress.explanation}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="card p-5 sm:p-6" aria-label="Energy pattern">
              <SectionHeader title="Energy pattern" subtitle="From your optional daily check-ins" />
              {checkinDays === 0 ? (
                <p className="mt-4 text-[13.5px] text-ink2">
                  No check-ins this week. The one-tap “How are you feeling?” on Health feeds this card.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {(["energized", "okay", "tired"] as const).map((e) => (
                    <div key={e} className="flex items-center gap-3">
                      <span className="w-20 text-[13px] font-medium capitalize text-ink2">{e}</span>
                      <div className="flex-1">
                        <ProgressBar
                          percent={checkinDays > 0 ? Math.round((energyCounts[e] / checkinDays) * 100) : 0}
                          tone={e === "energized" ? "accent" : e === "okay" ? "amber" : "red"}
                          height={6}
                        />
                      </div>
                      <span className="w-8 text-right text-[13px] font-semibold text-ink">
                        {energyCounts[e]}
                      </span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11.5px] text-ink3">
                    Based on {checkinDays} check-in{checkinDays === 1 ? "" : "s"} — a self-report, not an assessment.
                  </p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
