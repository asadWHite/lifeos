"use client";

import { useEffect, useState } from "react";
import { Activity, BedDouble, Moon, Sunrise, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Storage } from "@/lib/client/storage";
import { guidanceForAge, statusForSession, STATUS_UI, weeklySleepStats, bedtimeForWake, type AgeGroup } from "@/lib/sleep";
import { dayPartsInTz, formatDayShort, formatDuration, lastNDays, todayInTz } from "@/lib/time";
import { SectionHeader, StatusPill } from "@/components/ui";
import { SleepActions, SleepHistoryList } from "@/components/sleep/SleepControls";
import { EnergyPicker } from "@/components/health/EnergyPicker";
import { ActivityLogger } from "@/components/health/ActivityLogger";

export default function HealthPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    const prefs = Storage.getPrefs(pid);
    if (!profile || !prefs) return;

    const tz = profile.timezone;
    const today = todayInTz(tz);
    const target = prefs.sleepTargetMinutes;

    const allSleeps = Storage.getSleeps().filter(s => s.profileId === pid);
    const activeSleep = allSleeps.find(s => !s.endedAt) || null;
    const sessions = allSleeps.filter(s => s.endedAt).sort((a,b) => +new Date(b.startedAt) - +new Date(a.startedAt)).slice(0,30);
    
    const allCheckins = Storage.getCheckins().filter(c => c.profileId === pid);
    const checkin = allCheckins.find(c => c.day === today) || null;
    
    const start = new Date(`${today}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    const startIso = start.toISOString().slice(0,10);
    const weekCheckins = allCheckins.filter(c => c.day >= startIso && c.day <= today);

    setData({ profile, prefs, tz, today, target, activeSleep, sessions, checkin, weekCheckins });
  }, []);

  if (!data) return null;
  const { profile, prefs, tz, today, target, activeSleep, sessions, checkin, weekCheckins } = data;

  const toLocal = (d: Date) => {
    const p = dayPartsInTz(tz, d);
    return { minutesAfterMidnight: p.hour * 60 + p.minute, dateIso: p.iso };
  };
  
  const stats = weeklySleepStats(sessions.map((s:any) => ({
    ...s, 
    startedAt: new Date(s.startedAt), 
    endedAt: s.endedAt ? new Date(s.endedAt) : null
  })), toLocal, today);

  const days = lastNDays(tz, 7).map((iso) => {
    const session = sessions.find((s:any) => dayPartsInTz(tz, new Date(s.startedAt)).iso === iso);
    const c = weekCheckins.find((w:any) => w.day === iso);
    
    const sessionWakeTime = session?.endedAt 
      ? new Date(session.endedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) 
      : null;

    return {
      iso, 
      label: formatDayShort(iso),
      sleepMinutes: session?.durationMinutes ?? null,
      wakeTime: sessionWakeTime,
      energy: c?.energy ?? null, 
      activityMinutes: c?.activityMinutes ?? null,
    };
  });

  const lastNight = sessions[0] ?? null;
  const lastNightWakeTime = lastNight?.endedAt 
    ? new Date(lastNight.endedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) 
    : null;

  const lastStatus = lastNight?.durationMinutes != null 
    ? statusForSession(lastNight.durationMinutes, lastNightWakeTime, prefs.wakeTime) 
    : null;

  const guidance = guidanceForAge((prefs.ageGroup as AgeGroup) ?? null);
  const suggestedBedtime = prefs.wakeTime && target ? bedtimeForWake(prefs.wakeTime, target) : null;

  const maxBarMinutes = Math.max(target ?? 480, ...days.map((d) => d.sleepMinutes ?? 0)) * 1.1;

  return (
    <div className="p-6 space-y-8 animate-fade pb-24">
      <header>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight italic">Salomatlik</h1>
        <p className="text-ink-muted text-sm mt-1 leading-relaxed">Uyqu va umumiy holat tahlili.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {/* Sleep Section */}
        <section className="metallic-card p-6 border-white/5 bg-brand-dark overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 text-brand-silver/5">
            <Moon size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-brand-light font-bold text-lg flex items-center gap-2">
                  <Moon size={18} className="text-brand-silver" />
                  Uyqu
                </h2>
                <p className="text-brand-silver/50 text-xs">Oxirgi tun natijasi</p>
              </div>
              {lastStatus && (
                <StatusPill tone={(STATUS_UI as any)[lastStatus].tone}>
                  {(STATUS_UI as any)[lastStatus].label}
                </StatusPill>
              )}
            </div>

            {lastNight?.durationMinutes != null ? (
              <div className="flex items-end gap-3 mb-8">
                <span className="text-5xl font-black text-brand-light tracking-tighter">
                  {formatDuration(lastNight.durationMinutes)}
                </span>
                <span className="text-brand-silver/40 text-sm font-medium mb-2 uppercase tracking-widest">
                  / {formatDuration(target)} target
                </span>
              </div>
            ) : (
              <p className="text-brand-silver/60 text-sm mb-8 italic">Hali ma'lumotlar yo'q. Bugun boshlang!</p>
            )}

            <SleepActions active={activeSleep ? { id: activeSleep.id, startedAt: activeSleep.startedAt } : null} timezone={tz} targetMinutes={target} bedtimeSuggestion={prefs.bedtime ?? suggestedBedtime} />
          </div>
        </section>

        {/* Energy & Activity */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-ink tracking-tight italic px-1 flex items-center gap-2">
             <Activity size={20} className="text-brand-silver" />
             Bugungi holat
          </h2>
          
          <div className="metallic-card p-6 space-y-8">
             <div className="space-y-3">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest px-1">Energiyangiz qanday?</p>
                <EnergyPicker current={checkin?.energy ?? null} />
             </div>
             
             <div className="space-y-3 pt-4 border-t border-border">
                <ActivityLogger initialMinutes={checkin?.activityMinutes ?? null} initialNote={checkin?.note ?? null} />
             </div>
          </div>
        </section>

        {/* Weekly Stats Chart */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-ink tracking-tight italic px-1 flex items-center gap-2">
             <TrendingUp size={20} className="text-brand-silver" />
             Haftalik ko'rinish
          </h2>
          
          <div className="metallic-card p-6 bg-surface">
            <div className="flex items-end justify-between h-40 gap-2 mb-6">
              {days.map((d) => {
                const dayStatus = d.sleepMinutes != null 
                  ? statusForSession(d.sleepMinutes, d.wakeTime, prefs.wakeTime) 
                  : null;
                
                const tone = d.sleepMinutes == null ? "bg-border" : 
                             dayStatus === "met" ? "bg-emerald-500" :
                             dayStatus === "short" ? "bg-amber-500" : "bg-red-500";
                             
                const height = d.sleepMinutes != null ? Math.max(10, (d.sleepMinutes / maxBarMinutes) * 100) : 5;
                
                return (
                  <div key={d.iso} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center h-full">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        className={`w-full max-w-[20px] rounded-t-lg ${tone} shadow-sm`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-ink-muted uppercase">{d.label}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
               <div>
                  <p className="text-[9px] font-black text-ink-muted uppercase tracking-wider">O'rtacha uyqu</p>
                  <p className="text-lg font-bold text-ink">{stats.averageMinutes ? formatDuration(stats.averageMinutes) : "—"}</p>
               </div>
               <div>
                  <p className="text-[9px] font-black text-ink-muted uppercase tracking-wider">Muntazamlik</p>
                  <p className="text-lg font-bold text-ink">{stats.wakeConsistency ? `±${stats.wakeConsistency}m` : "—"}</p>
               </div>
            </div>
          </div>
        </section>

        {/* History */}
        <section className="space-y-4">
           <h2 className="text-xl font-bold text-ink tracking-tight italic px-1">Tarix</h2>
           <div className="metallic-card bg-surface overflow-hidden">
             <SleepHistoryList sessions={sessions} timezone={tz} targetMinutes={target} />
           </div>
        </section>
      </div>

      <div className="metallic-card bg-brand-dark/5 p-4 border-white/5">
        <p className="text-[10px] text-ink-muted leading-relaxed text-center">
          LifeOS tibbiy qurilma emas. Ma'lumotlar foydalanuvchi tomonidan kiritilgan va faqat tavsiya xarakteriga ega. 
          Sog'ligingiz bilan bog'liq muammolar bo'lsa mutaxassisga murojaat qiling.
        </p>
      </div>
    </div>
  );
}
