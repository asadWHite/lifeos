"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Moon, 
  Target, 
  Zap, 
  LayoutDashboard, 
  Plus, 
  Clock, 
  CheckCircle2,
  Calendar,
  Sparkles
} from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { personalize } from "@/lib/personalization";
import { computeGoalProgress } from "@/lib/goals";
import { statusForSession, STATUS_UI } from "@/lib/sleep";
import { formatDateLong, formatDuration, greetingInTz, todayInTz } from "@/lib/time";
import { SectionHeader, ProgressBar } from "@/components/ui";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TodayPanel } from "@/components/home/TodayPanel";
import { SleepActions } from "@/components/sleep/SleepControls";
import { EnergyPicker } from "@/components/health/EnergyPicker";
import { BrainTeaser } from "@/components/brain/BrainTeaser";
import { motion } from "framer-motion";

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

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-8 h-8 border-4 border-brand-silver border-t-brand-dark rounded-full animate-spin" />
    </div>
  );

  const { profile, prefs, tz, today, tasks, goals, activeSleep, sleepRows, checkin } = data;
  const firstName = profile.name.split(" ")[0];

  const config = personalize({
    ...prefs,
    sleepTargetMinutes: prefs.sleepTargetMinutes,
  });

  const openToday = tasks.filter((t: any) => t.status !== "done" && t.dueDate != null && t.dueDate <= today);
  const completedToday = tasks.filter((t: any) => t.status === "done" && t.dueDate === today);
  const totalToday = openToday.length + completedToday.length;
  
  const lastNight = sleepRows[0] ?? null;
  const lastStatus = lastNight?.durationMinutes != null 
    ? statusForSession(lastNight.durationMinutes, lastNight.endedAt ? new Date(lastNight.endedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null, prefs.wakeTime) 
    : null;

  const activeGoals = goals
    .filter((g: any) => g.status === "active")
    .map((g: any) => ({ 
      ...g, 
      progress: computeGoalProgress(g, tasks.filter((t: any) => t.goalId === g.id)) 
    }))
    .slice(0, 2);

  const greeting = greetingInTz(tz);

  return (
    <div className="p-6 space-y-8 animate-fade pb-24">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-ink-muted mb-1">
            <Calendar size={14} />
            <span className="text-xs font-medium uppercase tracking-widest">{formatDateLong(today)}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight leading-none">
            {greeting.label.replace("Good", "Xayrli")}, <br/>
            <span className="text-brand-silver">{firstName}</span>
          </h1>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-brand-dark flex items-center justify-center text-brand-light shadow-metallic">
          <Zap size={24} fill="currentColor" />
        </div>
      </header>

      {/* Main Focus / Recommendations */}
      {config.insights.length > 0 && (
        <section className="metallic-card bg-brand-dark p-6 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={80} />
          </div>
          <h2 className="text-brand-light font-bold text-lg mb-2 flex items-center gap-2">
            <Sparkles size={18} className="text-brand-silver" />
            Tavsiya
          </h2>
          <p className="text-brand-silver/80 text-sm leading-relaxed mb-4">
            {config.insights[0]}
          </p>
          <button className="text-brand-light text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
            Batafsil <ArrowRight size={12} />
          </button>
        </section>
      )}

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/health" className="metallic-card p-5 space-y-4 hover:border-brand-silver/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Moon size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Uyqu</p>
            <p className="text-lg font-bold text-ink">
              {lastNight ? formatDuration(lastNight.durationMinutes) : "—"}
            </p>
          </div>
        </Link>
        <Link href="/goals" className="metallic-card p-5 space-y-4 hover:border-brand-silver/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Target size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Maqsad</p>
            <p className="text-lg font-bold text-ink">
              {goals.filter((g:any)=>g.status==='active').length} faol
            </p>
          </div>
        </Link>
      </div>

      {/* Tasks Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <h2 className="text-xl font-bold text-ink tracking-tight italic">Bugungi reja</h2>
          <Link href="/plan" className="text-xs font-bold text-brand-silver hover:text-brand-dark transition-colors">Hamasini ko'rish</Link>
        </div>
        
        <div className="metallic-card bg-surface overflow-hidden divide-y divide-border">
          {openToday.length > 0 ? (
            openToday.slice(0, 3).map((task: any) => (
              <TaskRow key={task.id} task={task} todayIso={today} />
            ))
          ) : (
            <div className="p-8 text-center">
              <CheckCircle2 size={32} className="mx-auto text-brand-silver/30 mb-3" />
              <p className="text-sm text-ink-muted font-medium">Barcha vazifalar bajarildi!</p>
            </div>
          )}
          <Link href="/plan" className="block p-4 bg-brand-light/50 text-center text-xs font-bold text-brand-dark hover:bg-brand-light transition-colors uppercase tracking-widest">
            + Vazifa qo'shish
          </Link>
        </div>
      </section>

      {/* Goal Progress Section */}
      {activeGoals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-ink tracking-tight italic px-2">Maqsadlar sari</h2>
          <div className="space-y-3">
            {activeGoals.map((goal: any) => (
              <div key={goal.id} className="metallic-card p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-sm text-ink">{goal.title}</h3>
                  <span className="text-xs font-extrabold text-brand-silver">{goal.progress.percent ?? 0}%</span>
                </div>
                <ProgressBar percent={goal.progress.percent} height={6} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Habits Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-ink tracking-tight italic px-2">Odatlar</h2>
        <EnergyPicker current={checkin?.energy ?? null} />
      </section>

      {/* Assistant */}
      <section className="metallic-card bg-brand-light p-6 border-brand-dark/5">
        <h2 className="text-brand-dark font-black text-sm uppercase tracking-[0.2em] mb-4">LifeOS Assistant</h2>
        <BrainTeaser prompts={config.quickPrompts} />
      </section>
    </div>
  );
}
