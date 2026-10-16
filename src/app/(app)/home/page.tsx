"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MoonStar, Target } from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { personalize } from "@/lib/personalization";
import { computeGoalProgress } from "@/lib/goals";
import { statusForSession, STATUS_COPY } from "@/lib/sleep";
import { formatDateLong, formatDuration, greetingInTz, todayInTz, addDaysIso } from "@/lib/time";
import { SectionHeader, ProgressBar } from "@/components/ui";
import { TaskRow, type TaskView } from "@/components/tasks/TaskRow";
import { TodayPanel } from "@/components/home/TodayPanel";
import { SleepActions } from "@/components/sleep/SleepControls";
import { EnergyPicker } from "@/components/health/EnergyPicker";
import { BrainTeaser } from "@/components/brain/BrainTeaser";

export default function HomePage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    const prefs = Storage.getPrefs(pid);
    if (!profile || !prefs) return;

    const tz = profile.timezone;
    const today = todayInTz(tz);

    const tasks = Storage.getTasks().filter(t => t.profileId === pid);
    const goals = Storage.getGoals().filter(g => g.profileId === pid);
    const sleeps = Storage.getSleeps().filter(s => s.profileId === pid).sort((a,b) => +new Date(b.startedAt) - +new Date(a.startedAt));
    const checkins = Storage.getCheckins().filter(c => c.profileId === pid);

    const activeSleep = sleeps.find(s => !s.endedAt) || null;
    const completedSleeps = sleeps.filter(s => s.endedAt);
    const checkin = checkins.find(c => c.day === today) || null;

    setData({
      profile, prefs, tz, today,
      tasks, goals, activeSleep, sleepRows: completedSleeps, checkin
    });
  }, []);

  if (!data) return null;

  const { profile, prefs, tz, today, tasks, goals, activeSleep, sleepRows, checkin } = data;
  const firstName = profile.name.split(" ")[0];

  const config = personalize({
    ageGroup: prefs.ageGroup, lifeStage: prefs.lifeStage, interests: prefs.interests,
    objectives: prefs.objectives, planningStyle: prefs.planningStyle,
    difficulties: prefs.difficulties, personalTime: prefs.personalTime, sleepTargetMinutes: prefs.sleepTargetMinutes,
  });
  const hidden = new Set(prefs.hiddenSections);
  const target = prefs.sleepTargetMinutes;

  const all = tasks;
  const openToday = all.filter((t: any) => t.status !== "done" && t.dueDate != null && t.dueDate <= today);
  const completedToday = all.filter((t: any) => t.status === "done" && t.dueDate === today);
  const upcoming = all.filter((t: any) => t.status !== "done" && t.dueDate != null && t.dueDate > today).slice(0, 5);
  const totalToday = openToday.length + completedToday.length;
  const goalTitles = Object.fromEntries(goals.map((g: any) => [g.id, g.title]));

  const lastNight = sleepRows[0] ?? null;
  const lastStatus = lastNight?.durationMinutes != null ? statusForSession(lastNight.durationMinutes, target) : null;

  const activeGoals = goals
    .filter((g: any) => g.status === "active")
    .map((g: any) => ({ ...g, progress: computeGoalProgress(g, tasks.filter((t: any) => t.goalId === g.id)) }))
    .sort((a: any, b: any) => (b.progress.percent ?? -1) - (a.progress.percent ?? -1))
    .slice(0, 3);

  const fragments: string[] = [];
  fragments.push(totalToday === 0 ? "Nothing planned yet" : `${completedToday.length} of ${totalToday} tasks done today`);
  if (lastNight?.durationMinutes != null) fragments.push(`Slept ${formatDuration(lastNight.durationMinutes)}`);
  if (activeGoals.length > 0 && activeGoals[0].progress.percent != null) fragments.push(`“${activeGoals[0].title}” at ${activeGoals[0].progress.percent}%`);

  const greeting = greetingInTz(tz);

  return (
    <div className="animate-rise">
      <header>
        <p className="text-[13.5px] font-medium text-ink3">{formatDateLong(today)}</p>
        <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] text-ink sm:text-[34px]">
          {greeting.label}, {firstName}
        </h1>
        <p className="mt-2 text-[14.5px] text-ink2">{fragments.join(" · ")}</p>
        {!hidden.has("checkin") && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-semibold text-ink2">How are you feeling?</span>
            <EnergyPicker current={checkin?.energy ?? null} />
          </div>
        )}
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5 sm:p-6" aria-label="Today's tasks">
            <SectionHeader
              title="Today"
              subtitle={totalToday > 0 ? `${completedToday.length} of ${totalToday} done — highest priority first` : "What would make today count?"}
            />
            <div className="mt-4">
              <TodayPanel openTasks={openToday} completedTasks={completedToday} todayIso={today} goalTitles={goalTitles} />
            </div>
          </section>

          {!hidden.has("upcoming") && upcoming.length > 0 && (
            <section className="card p-5 sm:p-6" aria-label="Upcoming tasks">
              <SectionHeader title="Coming up" subtitle={`Next after today — ${upcoming[0].dueDate === addDaysIso(today, 1) ? "starting tomorrow" : "ahead"}`} />
              <div className="mt-2 divide-y divide-line">
                {upcoming.map((t: any) => <TaskRow key={t.id} task={t} todayIso={today} goalTitle={t.goalId ? goalTitles[t.goalId] : null} />)}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-5">
          {!hidden.has("sleep") && (
            <section className="card p-5 sm:p-6" aria-label="Sleep">
              <SectionHeader
                title="Sleep"
                subtitle={activeSleep ? "A session is running" : lastNight?.durationMinutes != null ? "Last night" : "Not tracked yet"}
                action={<Link href="/health" className="text-[12.5px] font-semibold text-accent-ink hover:underline">Details</Link>}
              />
              <div className="mt-4">
                {activeSleep ? (
                  <SleepActions active={{ id: activeSleep.id, startedAt: activeSleep.startedAt }} timezone={tz} targetMinutes={target} bedtimeSuggestion={null} />
                ) : (
                  <>
                    {lastNight?.durationMinutes != null ? (
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[26px] font-bold tracking-tight text-ink">{formatDuration(lastNight.durationMinutes)}</span>
                          {target != null && <span className="text-[12.5px] text-ink3">of {formatDuration(target)} target</span>}
                        </div>
                        {lastStatus && (
                          <span className={`badge mt-1 ${STATUS_COPY[lastStatus].tone === "green" ? "bg-accent-soft text-accent-ink" : STATUS_COPY[lastStatus].tone === "amber" ? "bg-amber-soft text-amber" : "bg-red-soft text-red"}`}>
                            <MoonStar size={11} /> {STATUS_COPY[lastStatus].label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mb-4 text-[13px] leading-relaxed text-ink2">Track tonight's sleep to start building your rhythm — tap the button when you go to bed.</p>
                    )}
                    <SleepActions active={null} timezone={tz} targetMinutes={target} bedtimeSuggestion={prefs.bedtime ?? null} />
                  </>
                )}
              </div>
            </section>
          )}

          {!hidden.has("goals") && (
            <section className="card p-5 sm:p-6" aria-label="Goals">
              <SectionHeader title="Goals" action={<Link href="/goals" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-ink hover:underline">View all <ArrowRight size={12} /></Link>} />
              <div className="mt-4 space-y-4">
                {activeGoals.length === 0 ? (
                  <div className="rounded-[12px] bg-sunken p-4">
                    <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><Target size={15} className="text-accent" /> No goals yet</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">Goals give your daily tasks direction. Create one and link tasks to it — progress is measured honestly.</p>
                    <Link href="/goals" className="btn btn-primary btn-sm mt-3">Create a goal</Link>
                  </div>
                ) : (
                  activeGoals.map((g: any) => (
                    <Link key={g.id} href="/goals" className="group block">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[14px] font-semibold text-ink group-hover:text-accent-ink">{g.title}</p>
                        {g.progress.percent != null && <span className="text-[13px] font-semibold text-accent-ink">{g.progress.percent}%</span>}
                      </div>
                      <div className="mt-2"><ProgressBar percent={g.progress.percent} height={5} /></div>
                      <p className="mt-1.5 text-[11.5px] text-ink3">{g.progress.explanation}</p>
                    </Link>
                  ))
                )}
              </div>
            </section>
          )}

          {!hidden.has("brain") && (
            <section className="card p-5 sm:p-6" aria-label="Assistant">
              <SectionHeader title="Brain" subtitle="Your LIFEOS assistant" />
              <div className="mt-4"><BrainTeaser prompts={config.quickPrompts} /></div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
