"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarPlus, Moon, CheckCircle2, ArrowUpRight } from "lucide-react";
import { Storage, todayDate, type TaskRow, type GoalRow, type SleepSessionRow } from "@/lib/client/storage";
import { LampComponent } from "@/components/lamp/Lamp";
import { ScheduleModal } from "@/components/lamp/ScheduleModal";
import { TaskRow as TaskRowComponent } from "@/components/tasks/TaskRow";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import Link from "next/link";

export default function TodayPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [lastSleep, setLastSleep] = useState<SleepSessionRow | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTask, setShowTask] = useState(false);

  const reload = useCallback(() => {
    const id = Storage.getCurrentProfileId();
    if (!id) return;
    const p = Storage.getProfile(id);
    if (!p) return;
    
    const today = todayDate();
    const allTasks = Storage.getTasks().filter(t => t.profileId === id && t.dueDate === today);
    const allGoals = Storage.getGoals().filter(g => g.profileId === id && g.status === "active");
    const allSleeps = Storage.getSleeps().filter(s => s.profileId === id && s.endedAt).sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    setPid(id);
    setProfile(p);
    setTasks(allTasks);
    setGoals(allGoals);
    setLastSleep(allSleeps[0] ?? null);
  }, []);

  useEffect(() => {
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    reload();
  }, [router, reload]);

  if (!mounted || !profile) return null;

  const openTasks = tasks.filter(t => t.status !== "done");

  return (
    <div className="min-h-screen pb-24 overflow-x-hidden bg-[var(--c-bg)]">
      {/* ── Immersive Lamp Scene (Strict Reference Match) ── */}
      <section className="px-4 pt-4">
        <div className="lamp-immersive-scene overflow-hidden p-6 sm:p-12 relative flex flex-col items-center min-h-[460px]">
          <header className="w-full flex justify-between items-start mb-4 z-10">
            <div>
              <p className="text-label text-brand-silver/50 tracking-widest mb-1 uppercase">LifeOS</p>
              <h1 className="text-h1 text-white">Xayrli kun, {profile.name.split(" ")[0]}</h1>
            </div>
            <button
              onClick={() => setShowSchedule(true)}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all shadow-lg"
            >
              <CalendarPlus size={20} />
            </button>
          </header>

          <div className="w-full max-w-[400px] flex justify-center">
            {pid && <LampComponent profileId={pid} />}
          </div>
        </div>
      </section>

      {/* ── Content Grid (Elegant Greige Aesthetic) ── */}
      <section className="px-4 mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        
        <div className="greige-panel p-8 flex flex-col justify-between min-h-[340px] shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-h2 text-midnight">Bugungi Reja</h2>
              <button onClick={() => setShowTask(true)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-midnight shadow-md">
                <Plus size={20} />
              </button>
            </div>
            
            <div className="space-y-1">
              {openTasks.length > 0 ? (
                openTasks.slice(0, 5).map(t => (
                  <TaskRowComponent key={t.id} task={t} onChanged={reload} />
                ))
              ) : (
                <div className="py-12 text-center opacity-40">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-midnight" />
                  <p className="text-small text-midnight font-medium">Barcha vazifalar bajarildi</p>
                </div>
              )}
            </div>
          </div>
          
          <Link href="/plan" className="text-label text-midnight font-bold flex items-center gap-2 mt-8 hover:gap-3 transition-all border-t border-midnight/10 pt-4 uppercase tracking-wider">
            Rejani ko'rish <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="space-y-6">
          <Link href="/sleep" className="card bg-white border-none p-8 flex flex-col justify-between group min-h-[160px] shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between">
              <Moon size={24} className="text-greige" />
              <div className="text-right">
                <p className="text-label text-greige mb-1 uppercase tracking-widest">Uyqu</p>
                <p className="text-h2 text-midnight">
                  {lastSleep ? `${Math.floor(lastSleep.durationMinutes! / 60)}h ${lastSleep.durationMinutes! % 60}m` : "—"}
                </p>
              </div>
            </div>
            <p className="text-small text-muted mt-4 group-hover:text-midnight transition-colors italic">
              Uyqu tahlili va trendlar &rarr;
            </p>
          </Link>

          <div className="card bg-white border-none p-8 min-h-[160px] shadow-sm">
            <h3 className="text-label text-greige mb-6 uppercase tracking-widest">Maqsadlar</h3>
            <div className="space-y-5">
              {goals.length > 0 ? (
                goals.slice(0, 2).map(g => {
                  const pct = g.metricTarget ? Math.round((g.metricProgress / g.metricTarget) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex justify-between text-small font-bold text-midnight mb-2">
                        <span>{g.title}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-ivory rounded-full overflow-hidden">
                        <div className="h-full bg-midnight transition-all duration-1000" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-small text-muted italic">Hali maqsadlar yo'q</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {pid && (
        <ScheduleModal
          open={showSchedule}
          onClose={() => setShowSchedule(false)}
          goals={goals}
          profileId={pid}
          onSaved={reload}
        />
      )}
      <TaskSheet 
        open={showTask} 
        onClose={() => setShowTask(false)} 
        onAdded={reload} 
        goals={goals.map(g => ({ id: g.id, title: g.title }))} 
      />
    </div>
  );
}
