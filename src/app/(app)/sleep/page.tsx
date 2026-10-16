"use client";

import { useEffect, useState } from "react";
import { Moon, Clock, History, AlertCircle, CheckCircle2, Sliders } from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { statusForSession, STATUS_UI } from "@/lib/sleep";
import { todayInTz, formatDuration } from "@/lib/time";
import { SleepActions } from "@/components/sleep/SleepControls";
import { SectionHeader } from "@/components/ui";
import { motion } from "framer-motion";

export default function SleepPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    const prefs = Storage.getPrefs(pid);
    if (!profile || !prefs) return;

    const tz = profile.timezone;
    const today = todayInTz(tz);
    const allSleeps = Storage.getSleeps().filter(s => s.profileId === pid).sort((a,b) => +new Date(b.startedAt) - +new Date(a.startedAt));
    const activeSession = allSleeps.find(s => !s.endedAt) || null;
    const sessions = allSleeps.filter(s => s.endedAt);

    setData({ profile, prefs, tz, today, activeSession, sessions });
  }, []);

  if (!data) return null;
  const { profile, prefs, tz, today, activeSession, sessions } = data;

  return (
    <div className="p-6 space-y-8 animate-fade pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight italic">Uyqu</h1>
          <p className="text-ink-muted text-sm mt-1">Rejim va sifat nazorati.</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center text-ink-muted">
          <Sliders size={20} />
        </div>
      </header>

      {/* Main Sleep Control */}
      <section className="metallic-card bg-brand-dark p-8 border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-white/5">
          <Moon size={160} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-brand-silver/10 flex items-center justify-center text-brand-silver mb-6 shadow-lg">
            <Moon size={32} />
          </div>
          
          <h2 className="text-2xl font-bold text-brand-light mb-2">
            {activeSession ? "Hozir uxlash vaqti" : "Uyquni boshlang"}
          </h2>
          <p className="text-brand-silver/60 text-sm mb-8 max-w-[200px]">
            {activeSession 
              ? `Boshlangan vaqt: ${new Date(activeSession.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` 
              : `Maqsad: ${prefs.bedtime || 'belgilanmagan'}`}
          </p>

          <SleepActions active={activeSession ? { id: activeSession.id, startedAt: activeSession.startedAt } : null} timezone={tz} targetMinutes={prefs.sleepTargetMinutes} bedtimeSuggestion={null} />
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="metallic-card p-5 bg-surface">
          <p className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-1">Maqsad</p>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-brand-silver" />
            <span className="text-lg font-bold text-ink">{prefs.wakeTime || "—"}</span>
          </div>
        </div>
        <div className="metallic-card p-5 bg-surface">
          <p className="text-[10px] font-black text-ink-muted uppercase tracking-widest mb-1">Davomiylik</p>
          <div className="flex items-center gap-2">
            <History size={16} className="text-brand-silver" />
            <span className="text-lg font-bold text-ink">{formatDuration(prefs.sleepTargetMinutes || 480)}</span>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-ink-muted uppercase tracking-[0.2em] px-1">Holat qoidalari</h3>
        <div className="grid grid-cols-1 gap-2">
          {[
            { color: "bg-emerald-500", title: "O'z vaqtida", desc: "Uyg'onish maqsadga mos (+/- 30 daqiqa)" },
            { color: "bg-amber-500", title: "Biroz kechikish", desc: "30-90 daqiqa kech uyg'onish" },
            { color: "bg-red-500", title: "Sifatsiz uyqu", desc: "2 soatdan kam davomiylik yoki juda kech" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 metallic-card bg-surface/50 border-none shadow-none">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <div>
                <p className="text-xs font-bold text-ink">{item.title}</p>
                <p className="text-[10px] text-ink-muted leading-none mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section className="space-y-4 pb-8">
        <h3 className="text-xl font-bold text-ink tracking-tight italic flex items-center gap-2 px-1">
          <History size={20} className="text-brand-silver" />
          Tarix
        </h3>
        <div className="metallic-card bg-surface overflow-hidden">
          {sessions.length > 0 ? (
            <div className="divide-y divide-border">
              {sessions.map((s: any) => {
                const wakeTime = new Date(s.endedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const status = statusForSession(s.durationMinutes, wakeTime, prefs.wakeTime);
                const config = (STATUS_UI as any)[status || 'met'];
                
                return (
                  <div key={s.id} className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        status === 'met' ? 'bg-emerald-500/10 text-emerald-500' : 
                        status === 'short' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {status === 'met' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-ink">{new Date(s.startedAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}</p>
                        <p className="text-[10px] text-ink-muted uppercase font-bold tracking-tighter">
                          {new Date(s.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — {wakeTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-ink">{formatDuration(s.durationMinutes)}</p>
                      <p className="text-[9px] font-black uppercase tracking-tighter" style={{ color: config.tone === 'green' ? '#10b981' : config.tone === 'amber' ? '#f59e0b' : '#ef4444' }}>
                        {config.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center text-ink-muted">
              <History size={32} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">Hali yozuvlar yo'q</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
