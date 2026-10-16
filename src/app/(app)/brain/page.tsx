"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck, Database, Eye, KeyRound } from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { personalize } from "@/lib/personalization";
import { Chat } from "@/components/brain/Chat";
import { computeGoalProgress } from "@/lib/goals";
import { weeklySleepStats } from "@/lib/sleep";
import { todayInTz, dayPartsInTz, addDaysIso } from "@/lib/time";
import { labelFor, LIFE_STAGES, OBJECTIVES, INTERESTS } from "@/lib/onboarding";

export default function BrainPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("m")?.slice(0, 300) || null;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    const prefs = Storage.getPrefs(pid);
    if (!profile || !prefs) return;

    const tz = profile.timezone;
    const today = todayInTz(tz);
    const history = Storage.getMessages().filter(m => m.profileId === pid).sort((a,b) => +new Date(a.createdAt) - +new Date(b.createdAt)).slice(-50);
    
    const tasks = Storage.getTasks().filter(t => t.profileId === pid);
    const goals = Storage.getGoals().filter(g => g.profileId === pid);
    const sleeps = Storage.getSleeps().filter(s => s.profileId === pid);
    const checkins = Storage.getCheckins().filter(c => c.profileId === pid);

    const todayTasks = tasks.filter(t => t.dueDate === today).slice(0,12);
    const overdueCount = tasks.filter(t => t.status !== "done" && t.dueDate && t.dueDate < today).length;
    
    const completedSleeps = sleeps.filter(s => s.endedAt).slice(0,30);
    const toLocal = (d: Date) => { const p = dayPartsInTz(tz, d); return { minutesAfterMidnight: p.hour * 60 + p.minute, dateIso: p.iso }; };
    const sleepStats = weeklySleepStats(completedSleeps.map((s:any)=>({...s, startedAt:new Date(s.startedAt), endedAt:new Date(s.endedAt)})), toLocal, today);

    let bedtime = prefs.bedtime;
    if (!bedtime && prefs.wakeTime && prefs.sleepTargetMinutes) {
      const [h, m] = prefs.wakeTime.split(":").map(Number);
      let total = h * 60 + m - prefs.sleepTargetMinutes;
      while (total < 0) total += 24 * 60;
      total = total % (24 * 60);
      bedtime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }

    const ctx = {
      name: profile.name.split(" ")[0],
      lifeStageLabel: labelFor(LIFE_STAGES, prefs.lifeStage),
      objectiveLabels: prefs.objectives.map((o:any) => labelFor(OBJECTIVES, o) ?? o),
      interestLabels: prefs.interests.map((i:any) => labelFor(INTERESTS, i) ?? i),
      sleepTargetMinutes: prefs.sleepTargetMinutes,
      bedtime, wakeTime: prefs.wakeTime,
      today: todayTasks.map(t => ({ title: t.title, done: t.status === "done", priority: t.priority, durationMinutes: t.durationMinutes })),
      overdueCount, tomorrowCount: tasks.filter(t => t.dueDate === addDaysIso(today, 1)).length,
      goals: goals.filter(g => g.status === "active").slice(0,5).map(g => {
        const progress = computeGoalProgress(g, tasks.filter(t => t.goalId === g.id));
        return { title: g.title, percent: progress.percent, explanation: progress.explanation };
      }),
      lastSleepMinutes: completedSleeps[0]?.durationMinutes ?? null,
      weekSleepAverage: sleepStats.averageMinutes,
      energy: checkins.find(c => c.day === today)?.energy ?? null,
    };

    setData({ profile, prefs, history, ctx });
  }, []);

  if (!data) return null;
  const { profile, prefs, history, ctx } = data;

  const config = personalize({
    ageGroup: prefs.ageGroup, lifeStage: prefs.lifeStage, interests: prefs.interests,
    objectives: prefs.objectives, planningStyle: prefs.planningStyle, difficulties: prefs.difficulties,
    personalTime: prefs.personalTime, sleepTargetMinutes: prefs.sleepTargetMinutes,
  });

  return (
    <div className="animate-rise grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <header className="pb-4">
          <h1 className="text-[26px] font-bold tracking-tight text-ink">Brain</h1>
          <p className="mt-1 text-[14px] text-ink2">Your assistant for planning, tasks, and answers about your own data.</p>
        </header>

        <div className="card mb-4 flex items-start gap-3 border-info-soft bg-info-soft/60 p-4">
          <KeyRound size={17} className="mt-0.5 shrink-0 text-info" />
          <div className="text-[13px] leading-relaxed text-ink2">
            <p className="font-semibold text-ink">Running in Local-First Mode (Built-in Rules)</p>
            <p className="mt-1">
              Because you are using LIFEOS completely locally, the assistant is running via built-in rules inside your browser. No external API keys are required and your data never leaves your device.
            </p>
          </div>
        </div>

        <Chat initialMessages={history} prompts={config.quickPrompts} initialQuery={initialQuery} profile={profile} prefs={prefs} ctx={ctx} />
      </div>

      <aside className="space-y-5">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-ink"><Eye size={15} className="text-ink3" /> What I can use to answer</h2>
          <ul className="mt-3 space-y-2.5">
            {["Today's tasks and overdue items", "Active goals and their real progress", "Sleep totals (last night + weekly average)", "Your explicit onboarding preferences"].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink2"><CircleCheck size={14} className="mt-0.5 shrink-0 text-accent" />{item}</li>
            ))}
          </ul>
          <div className="divider my-4" />
          <p className="flex items-start gap-2.5 text-[12px] leading-relaxed text-ink3">
            <Database size={14} className="mt-0.5 shrink-0" />
            Only this summarized context is used. Because you are in Local-First Mode, everything is processed instantly on your device.
          </p>
        </div>
      </aside>
    </div>
  );
}
