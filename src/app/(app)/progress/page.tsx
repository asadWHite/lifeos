"use client";

import { useEffect, useState } from "react";
import { ChartColumn, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { computeGoalProgress } from "@/lib/goals";
import { statusForSession, STATUS_COPY, weeklySleepStats } from "@/lib/sleep";
import { addDaysIso, dayPartsInTz, formatDayShort, formatDuration, lastNDays, todayInTz } from "@/lib/time";
import { EmptyState, ProgressBar, SectionHeader } from "@/components/ui";

export default function ProgressPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    const prefs = Storage.getPrefs(pid);
    if (!profile || !prefs) return;

    const tz = profile.timezone;
    const today = todayInTz(tz);
    const startIso = addDaysIso(today, -6);

    const allTasks = Storage.getTasks().filter(t => t.profileId === pid);
    const completed = allTasks.filter(t => t.status === "done" && t.completedAt && new Date(t.completedAt) >= new Date(`${startIso}T00:00:00Z`));
    
    const goals = Storage.getGoals().filter(g => g.profileId === pid);
    const goalRows = goals.map(g => ({ ...g, tasks: allTasks.filter(t => t.goalId === g.id) }));
    
    const sessions = Storage.getSleeps().filter(s => s.profileId === pid && s.endedAt).sort((a,b) => +new Date(b.startedAt) - +new Date(a.startedAt)).slice(0,30);
    const checkins = Storage.getCheckins().filter(c => c.profileId === pid && c.day >= startIso && c.day <= today).sort((a,b) => a.day < b.day ? -1 : 1);

    setData({ profile, prefs, tz, today, completed, allTasks, goalRows, sessions, checkins });
  }, []);

  if (!data) return null;
  const { profile, prefs, tz, today, completed, allTasks, goalRows, sessions, checkins } = data;
  const target = prefs.sleepTargetMinutes;

  const toLocal = (d: Date) => {
    const p = dayPartsInTz(tz, d);
    return { minutesAfterMidnight: p.hour * 60 + p.minute, dateIso: p.iso };
  };

  const week = lastNDays(tz, 7);
  const perDay: Record<string, number> = Object.fromEntries(week.map((d) => [d, 0]));
  for (const t of completed) {
    if (!t.completedAt) continue;
    const iso = dayPartsInTz(tz, new Date(t.completedAt)).iso;
    if (iso in perDay) perDay[iso] += 1;
  }
  const maxTasks = Math.max(1, ...Object.values(perDay));
  const weekTotal = completed.length;

  const sleepStats = weeklySleepStats(sessions.map((s:any)=>({...s, startedAt:new Date(s.startedAt), endedAt:new Date(s.endedAt)})), toLocal, today);
  const delta = sleepStats.averageMinutes != null && sleepStats.prevAverageMinutes != null
      ? sleepStats.averageMinutes - sleepStats.prevAverageMinutes
      : null;

  const activeGoals = goalRows.filter((g:any) => g.status === "active").map((g:any) => ({ title: g.title, progress: computeGoalProgress(g, g.tasks) }));
  const measurable = activeGoals.filter((g:any) => g.progress.percent != null);
  const avgGoalPercent = measurable.length > 0 ? Math.round(measurable.reduce((a:any, g:any) => a + (g.progress.percent ?? 0), 0) / measurable.length) : null;

  const energyCounts = { energized: 0, okay: 0, tired: 0 };
  for (const c of checkins) {
    if (c.energy && c.energy in energyCounts) energyCounts[c.energy as keyof typeof energyCounts] += 1;
  }
  const checkinDays = checkins.filter((c:any) => c.energy).length;
  const activityTotal = checkins.reduce((a:any, c:any) => a + (c.activityMinutes ?? 0), 0);
  const openTasks = allTasks.filter((t:any) => t.status !== "done").length;
  const hasAnyData = weekTotal > 0 || sleepStats.nightsTracked > 0 || activeGoals.length > 0 || checkinDays > 0;

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Progress</h1>
        <p className="mt-1 text-[14px] text-ink2">The last 7 days — computed only from data you&rsquo;ve actually recorded.</p>
      </header>

      {!hasAnyData ? (
        <div className="card mt-7">
          <EmptyState icon={ChartColumn} title="Nothing to measure yet" body={openTasks > 0 ? "Complete a task, track one night of sleep, or check in on Health — your trends will appear here." : "Add a task on Home, track a night of sleep, or check in on Health — your trends will appear here."} />
        </div>
      ) : (
        <>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="card p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Tasks done</p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">{weekTotal}</p>
              <p className="text-[12px] text-ink3">this week · {openTasks} open</p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Sleep average</p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">{sleepStats.averageMinutes != null ? formatDuration(sleepStats.averageMinutes) : "—"}</p>
              <p className="flex items-center gap-1 text-[12px] text-ink3">
                {delta == null ? "need prior week to compare" : <>{delta > 0 ? <TrendingUp size={12} className="text-accent" /> : delta < 0 ? <TrendingDown size={12} className="text-amber" /> : <Minus size={12} />}{delta === 0 ? "same as last week" : `${delta > 0 ? "+" : ""}${formatDuration(delta)} vs last week`}</>}
              </p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Goals active</p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">{activeGoals.length}</p>
              <p className="text-[12px] text-ink3">{avgGoalPercent != null ? `avg ${avgGoalPercent}% where measurable` : "add targets to measure"}</p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Activity</p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">{activityTotal > 0 ? `${activityTotal}m` : "—"}</p>
              <p className="text-[12px] text-ink3">{checkinDays > 0 ? `${checkinDays} check-in${checkinDays === 1 ? "" : "s"} this week` : "no check-ins yet"}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="card p-5 sm:p-6" aria-label="Tasks completed per day">
              <SectionHeader title="Tasks completed" subtitle="Per day, last 7 days" />
              {weekTotal === 0 ? (
                <p className="mt-4 text-[13.5px] text-ink2">No tasks completed this week. Your daily completion bars will show up here as you finish tasks.</p>
              ) : (
                <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3">
                  {week.map((iso) => {
                    const count = perDay[iso];
                    return (
                      <div key={iso} className="flex flex-col items-center gap-1.5">
                        <div className="flex h-24 w-full items-end justify-center">
                          <div className={`w-full max-w-7 rounded-md ${count > 0 ? "bg-accent" : "bg-line"}`} style={{ height: count > 0 ? Math.max(8, (count / maxTasks) * 96) : 4 }} />
                        </div>
                        <span className="text-[11px] font-medium text-ink3">{formatDayShort(iso)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card p-5 sm:p-6" aria-label="Sleep trend">
              <SectionHeader title="Sleep trend" subtitle={target ? `Compared with your ${formatDuration(target)} target` : "Set a target in Settings to compare"} />
              {sleepStats.nightsTracked === 0 ? (
                <p className="mt-4 text-[13.5px] text-ink2">No nights tracked this week. Start sleep tracking from Home or Health to see the trend.</p>
              ) : (
                <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3">
                  {week.map((iso) => {
                    const s = sessions.find((x:any) => dayPartsInTz(tz, new Date(x.startedAt)).iso === iso);
                    const status = s?.durationMinutes != null ? statusForSession(s.durationMinutes, target) : null;
                    const tone = s?.durationMinutes == null ? "bg-line" : status == null ? "bg-line-strong" : STATUS_COPY[status].tone === "green" ? "bg-accent" : STATUS_COPY[status].tone === "amber" ? "bg-amber" : "bg-red";
                    const max = Math.max(target ?? 480, ...[0, ...sessions.map((x:any) => x.durationMinutes ?? 0)]) * 1.1;
                    const h = s?.durationMinutes != null ? Math.max(8, (s.durationMinutes / max) * 96) : 4;
                    return (
                      <div key={iso} className="flex flex-col items-center gap-1.5">
                        <div className="flex h-24 w-full items-end justify-center">
                          <div className={`w-full max-w-7 rounded-md ${tone}`} style={{ height: h }} />
                        </div>
                        <span className="text-[11px] font-medium text-ink3">{formatDayShort(iso)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="card p-5 sm:p-6" aria-label="Goal progress">
              <SectionHeader title="Goals" subtitle="Real progress from tasks and targets" />
              <div className="mt-4 space-y-4">
                {activeGoals.length === 0 ? (
                  <p className="text-[13.5px] text-ink2">No active goals. Create one on the Goals page and it will be tracked here.</p>
                ) : (
                  activeGoals.map((g:any) => (
                    <div key={g.title}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[14px] font-semibold text-ink">{g.title}</p>
                        {g.progress.percent != null && <span className="text-[13px] font-bold text-accent-ink">{g.progress.percent}%</span>}
                      </div>
                      <div className="mt-2"><ProgressBar percent={g.progress.percent} height={5} /></div>
                      <p className="mt-1 text-[11.5px] text-ink3">{g.progress.explanation}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="card p-5 sm:p-6" aria-label="Energy pattern">
              <SectionHeader title="Energy pattern" subtitle="From your optional daily check-ins" />
              {checkinDays === 0 ? (
                <p className="mt-4 text-[13.5px] text-ink2">No check-ins this week. The one-tap “How are you feeling?” on Health feeds this card.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {(["energized", "okay", "tired"] as const).map((e) => (
                    <div key={e} className="flex items-center gap-3">
                      <span className="w-20 text-[13px] font-medium capitalize text-ink2">{e}</span>
                      <div className="flex-1"><ProgressBar percent={checkinDays > 0 ? Math.round((energyCounts[e] / checkinDays) * 100) : 0} tone={e === "energized" ? "accent" : e === "okay" ? "amber" : "red"} height={6} /></div>
                      <span className="w-8 text-right text-[13px] font-semibold text-ink">{energyCounts[e]}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
