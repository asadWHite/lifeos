"use client";

import { useEffect, useState } from "react";
import { 
  ClipboardList, 
  CheckCircle2, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Clock,
  Filter,
  AlertCircle
} from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { todayInTz, friendlyDue } from "@/lib/time";
import { TaskRow } from "@/components/tasks/TaskRow";
import { InlineTaskAdd } from "@/components/tasks/InlineTaskAdd";
import { motion } from "framer-motion";

export default function PlanPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    if (!profile) return;

    const tz = profile.timezone;
    const today = todayInTz(tz);
    const tasks = Storage.getTasks().filter(t => t.profileId === pid);
    const goals = Storage.getGoals().filter(g => g.profileId === pid);

    setData({ profile, tz, today, tasks, goals });
  }, []);

  if (!data) return null;
  const { today, tasks, goals } = data;

  const overdue = tasks.filter((t:any) => t.status !== 'done' && t.dueDate && t.dueDate < today);
  const openToday = tasks.filter((t:any) => t.status !== 'done' && t.dueDate === today);
  const completedToday = tasks.filter((t:any) => t.status === 'done' && t.dueDate === today);
  const upcoming = tasks.filter((t:any) => t.status !== 'done' && t.dueDate && t.dueDate > today);
  const goalTitles = Object.fromEntries(goals.map((g: any) => [g.id, g.title]));

  return (
    <div className="p-6 space-y-8 animate-fade pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight italic">Reja</h1>
          <p className="text-ink-muted text-sm mt-1">Kunlik vazifalar boshqaruvi.</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center text-ink-muted">
          <Filter size={20} />
        </div>
      </header>

      {/* Quick Add Section */}
      <section>
        <InlineTaskAdd dueDate={today} placeholder="Bugun nima qilmoqchisiz?" />
      </section>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-red-500 px-1">
             <AlertCircle size={16} />
             <h2 className="text-xs font-black uppercase tracking-[0.2em]">Kechikkan vazifalar</h2>
          </div>
          <div className="metallic-card bg-red-50/50 overflow-hidden divide-y divide-red-100/50">
            {overdue.map((t:any) => (
              <TaskRow key={t.id} task={t} todayIso={today} goalTitle={t.goalId ? goalTitles[t.goalId] : null} />
            ))}
          </div>
        </section>
      )}

      {/* Today Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-ink tracking-tight italic px-1">Bugun</h2>
        <div className="metallic-card bg-surface overflow-hidden divide-y divide-border">
          {openToday.length > 0 ? (
            openToday.map((t:any) => (
              <TaskRow key={t.id} task={t} todayIso={today} goalTitle={t.goalId ? goalTitles[t.goalId] : null} />
            ))
          ) : (
            <div className="p-8 text-center text-ink-muted">
              <CheckCircle2 size={24} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Ochiq vazifalar yo'q</p>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <section className="space-y-4">
           <h2 className="text-xs font-black text-ink-muted uppercase tracking-[0.2em] px-1">Kelgusida</h2>
           <div className="metallic-card bg-surface/50 overflow-hidden divide-y divide-border/50">
              {upcoming.map((t:any) => (
                <TaskRow key={t.id} task={t} todayIso={today} goalTitle={t.goalId ? goalTitles[t.goalId] : null} />
              ))}
           </div>
        </section>
      )}

      {/* Completed Section */}
      {completedToday.length > 0 && (
        <section className="space-y-4">
           <h2 className="text-xs font-black text-ink-muted uppercase tracking-[0.2em] px-1">Bugun bajarildi</h2>
           <div className="opacity-60 metallic-card bg-brand-light/20 overflow-hidden divide-y divide-border/30">
              {completedToday.map((t:any) => (
                <TaskRow key={t.id} task={t} todayIso={today} goalTitle={t.goalId ? goalTitles[t.goalId] : null} />
              ))}
           </div>
        </section>
      )}
    </div>
  );
}
