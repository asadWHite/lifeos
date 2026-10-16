"use client";

import { useEffect, useState } from "react";
import { Zap, CheckCircle2, History, Plus, Target, Flame, Calendar } from "lucide-react";
import { Storage, generateId } from "@/lib/client/storage";
import { todayInTz } from "@/lib/time";
import { motion } from "framer-motion";

export default function HabitsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    if (!profile) return;

    const tz = profile.timezone;
    const today = todayInTz(tz);
    const allHabits = Storage.get("habits", []);
    const allLogs = Storage.get("habit_logs", []);

    setData({ profile, today, habits: allHabits.filter((h:any)=>h.profileId===pid), logs: allLogs });
  }, []);

  if (!data) return null;
  const { today, habits, logs } = data;

  const toggleHabit = (habitId: string) => {
    const existingLog = logs.find((l:any) => l.habitId === habitId && l.date === today);
    let nextLogs;
    if (existingLog) {
      nextLogs = logs.filter((l:any) => l.id !== existingLog.id);
    } else {
      nextLogs = [...logs, { id: generateId(), habitId, date: today, createdAt: new Date() }];
    }
    Storage.set("habit_logs", nextLogs);
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-8 animate-fade pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight italic">Odatlar</h1>
          <p className="text-ink-muted text-sm mt-1">Muntazamlik — muvaffaqiyat kaliti.</p>
        </div>
        <button className="w-10 h-10 rounded-xl bg-brand-dark text-white flex items-center justify-center shadow-metallic">
          <Plus size={20} />
        </button>
      </header>

      {/* Habit List */}
      <section className="space-y-4">
        {habits.length > 0 ? (
          habits.map((habit: any) => {
            const isDone = logs.some((l:any) => l.habitId === habit.id && l.date === today);
            
            // Basic streak calculation
            let streak = 0;
            let checkDate = new Date(today);
            while (true) {
              const dStr = checkDate.toISOString().slice(0,10);
              if (logs.some((l:any) => l.habitId === habit.id && l.date === dStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                break;
              }
            }

            return (
              <div key={habit.id} className="metallic-card p-5 flex items-center justify-between group transition-all">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
                      isDone 
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' 
                        : 'border-border text-ink-muted hover:border-brand-silver'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={24} /> : <Zap size={24} />}
                  </button>
                  <div>
                    <h3 className={`font-bold text-sm ${isDone ? 'text-ink-muted line-through opacity-60' : 'text-ink'}`}>
                      {habit.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="flex items-center gap-1 text-[10px] font-black text-orange-500 uppercase tracking-tighter">
                          <Flame size={12} fill="currentColor" /> {streak} kunlik streak
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="metallic-card p-12 text-center bg-surface/50 border-dashed border-border shadow-none">
            <Zap size={40} className="mx-auto text-brand-silver/20 mb-4" />
            <p className="text-sm text-ink-muted font-bold uppercase tracking-widest mb-6">Yangi odatlar shakllantiring</p>
            <button className="btn-primary">Boshlash</button>
          </div>
        )}
      </section>

      {/* History Grid */}
      <section className="space-y-4">
         <h2 className="text-xs font-black text-ink-muted uppercase tracking-[0.2em] px-1 flex items-center gap-2">
            <Calendar size={14} /> Tarix (Oxirgi 7 kun)
         </h2>
         <div className="metallic-card p-4 bg-surface/80 flex justify-between gap-1 overflow-x-auto">
            {/* Simple week visualization */}
            {Array.from({length: 7}).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dStr = d.toISOString().slice(0,10);
              const dayTotal = logs.filter((l:any) => l.date === dStr).length;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-[40px]">
                   <div className="w-full aspect-square rounded-lg bg-bg border border-border flex items-center justify-center relative overflow-hidden">
                      {dayTotal > 0 && (
                        <div className="absolute inset-0 bg-emerald-500 opacity-20" />
                      )}
                      <span className="text-[10px] font-black text-ink z-10">{dayTotal}</span>
                   </div>
                   <span className="text-[9px] font-bold text-ink-muted uppercase">{d.toLocaleDateString('uz-UZ', { weekday: 'short' })}</span>
                </div>
              );
            })}
         </div>
      </section>
    </div>
  );
}
