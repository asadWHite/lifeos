"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, Settings2 } from "lucide-react";
import {
  Storage, generateId, fmtTime, fmtDuration,
  type SleepSessionRow, type PreferencesRow
} from "@/lib/client/storage";
import { ActiveSleepCard, SleepHistory, sleepStatus } from "@/components/sleep/SleepControls";
import { Modal, Field, Toggle } from "@/components/ui/index";

function minsElapsed(startISO: string) {
  return Math.round((Date.now() - new Date(startISO).getTime()) / 60000);
}

export default function SleepPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PreferencesRow | null>(null);
  const [sessions, setSessions] = useState<SleepSessionRow[]>([]);
  const [active, setActive] = useState<SleepSessionRow | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editWake, setEditWake] = useState("07:00");
  const [editBed, setEditBed] = useState("23:00");
  const [editTarget, setEditTarget] = useState(480);

  const reload = useCallback(() => {
    const id = Storage.getCurrentProfileId();
    if (!id) return;
    setPid(id);
    const p = Storage.getPrefs(id);
    setPrefs(p);
    setEditWake(p.wakeTime ?? "07:00");
    setEditBed(p.bedtime ?? "23:00");
    setEditTarget(p.sleepTargetMinutes ?? 480);
    const all = Storage.getSleeps().filter(s => s.profileId === id);
    const act = all.find(s => !s.endedAt) ?? null;
    setActive(act);
    setSessions(all.filter(s => s.endedAt).sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
  }, []);

  useEffect(() => {
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    reload();
  }, [router, reload]);

  function startSleep() {
    if (!pid || active) return;
    Storage.saveSleep({ id: generateId(), profileId: pid, startedAt: new Date().toISOString(), endedAt: null, durationMinutes: null, manual: false, createdAt: new Date().toISOString() });
    reload();
  }

  function wakeUp() {
    if (!pid || !active) return;
    const endedAt = new Date().toISOString();
    const dur = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(active.startedAt).getTime()) / 60000));
    Storage.saveSleep({ ...active, endedAt, durationMinutes: dur });
    reload();
  }

  function saveSettings() {
    if (!pid) return;
    const p = Storage.getPrefs(pid);
    Storage.savePrefs({ ...p, wakeTime: editWake, bedtime: editBed, sleepTargetMinutes: editTarget, updatedAt: new Date().toISOString() });
    setShowSettings(false);
    reload();
  }

  if (!mounted || !prefs) return null;

  // Stats
  const recentSessions = sessions.slice(0, 7);
  const avg = recentSessions.length > 0 ? Math.round(recentSessions.reduce((a,s) => a+(s.durationMinutes??0), 0) / recentSessions.length) : null;
  const lastSession = sessions[0];
  const lastStatus = lastSession?.durationMinutes && prefs.wakeTime ? sleepStatus(lastSession.durationMinutes, prefs.sleepTargetMinutes ?? 480, lastSession.endedAt!, prefs.wakeTime) : null;
  const statusColors = { green: "#3F8065", yellow: "#C8943E", red: "#C65B55" };

  return (
    <div className="min-h-dvh bg-[var(--c-bg)] page-enter">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex items-end justify-between">
        <div>
          <p className="text-label text-[var(--c-ink2)]">UYQU</p>
          <h1 className="text-h1 mt-1">Uyqu nazorati</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="btn btn-ghost btn-sm">
          <Settings2 size={16} /> Sozlash
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* Active session */}
        {active
          ? <ActiveSleepCard session={active} targetWake={prefs.wakeTime} onWoke={wakeUp} />
          : (
            <div className="card-dark rounded-2xl p-6 space-y-6" style={{ background: "#202833" }}>
              {/* Last night summary */}
              {lastSession && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-label text-[#ADA996] mb-1">KECHA UYQU</p>
                    <p className="text-display text-[#F2F2F2]" style={{ fontSize: "2.5rem" }}>
                      {fmtDuration(lastSession.durationMinutes)}
                    </p>
                    {lastStatus && (
                      <span className="badge mt-1 inline-block" style={{ background: `${statusColors[lastStatus]}22`, color: statusColors[lastStatus] }}>
                        {lastStatus === "green" ? "O'apos;z vaqtida" : lastStatus === "yellow" ? "Biroz kech" : "Sifatsiz"}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-small text-[#ADA996]">Maqsad</p>
                    <p className="text-h2 text-[#F2F2F2]">{fmtDuration(prefs.sleepTargetMinutes)}</p>
                  </div>
                </div>
              )}

              {/* Sleep schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-label text-[#ADA996] mb-1">UXLASH</p>
                  <p className="text-h2 text-[#F2F2F2]">{prefs.bedtime ?? "—"}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-label text-[#ADA996] mb-1">UYG'apos;ONISH</p>
                  <p className="text-h2 text-[#F2F2F2]">{prefs.wakeTime ?? "—"}</p>
                </div>
              </div>

              {/* Start button */}
              <button onClick={startSleep} className="w-full h-14 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-base" style={{ background: "#202833", border: "1px solid rgba(255,255,255,0.12)" }}>
                <Moon size={20} style={{ color: "#FF633C" }} />
                Uyquni boshlash
              </button>
            </div>
          )
        }

        {/* 7-day bar chart */}
        {sessions.length > 0 && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-h3">7 kunlik trend</h2>
              {avg && <p className="text-small text-[var(--c-ink2)]">O'apos;rtacha: {fmtDuration(avg)}</p>}
            </div>
            <div className="flex items-end gap-2 h-20">
              {Array.from({ length: 7 }).map((_, i) => {
                const dayDate = new Date();
                dayDate.setDate(dayDate.getDate() - (6 - i));
                const dayStr = dayDate.toISOString().slice(0,10);
                const s = sessions.find(x => x.startedAt.slice(0,10) === dayStr);
                const dur = s?.durationMinutes ?? 0;
                const maxDur = Math.max(prefs.sleepTargetMinutes ?? 480, ...sessions.map(x => x.durationMinutes ?? 0));
                const h = dur > 0 ? Math.max(8, (dur / maxDur) * 64) : 4;
                const st = dur > 0 && prefs.wakeTime && s?.endedAt ? sleepStatus(dur, prefs.sleepTargetMinutes ?? 480, s.endedAt, prefs.wakeTime) : null;
                const bg = st === "green" ? "#3F8065" : st === "yellow" ? "#C8943E" : st === "red" ? "#C65B55" : "var(--c-surface2)";
                const day = dayDate.toLocaleDateString("en-GB", { weekday: "short" });
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm transition-all" style={{ height: h, background: bg }} />
                    <span className="text-label" style={{ fontSize: "9px", color: "var(--c-ink2)" }}>{day}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 flex-wrap">
              {[["#3F8065","O'apos;z vaqtida"],["#C8943E","Biroz kech"],["#C65B55","Sifatsiz"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                  <span className="text-small text-[var(--c-ink2)]">{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="card">
          <h2 className="text-h3 mb-4">Tarix</h2>
          <SleepHistory sessions={sessions.slice(0,10)} targetWake={prefs.wakeTime} onChanged={reload} />
        </div>
      </div>

      {/* Settings modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Uyqu sozlamalari" size="sm">
        <div className="space-y-4">
          <Field label="Uyg'apos;onish vaqti" htmlFor="sw-wake">
            <input id="sw-wake" type="time" className="input" value={editWake} onChange={e => setEditWake(e.target.value)} />
          </Field>
          <Field label="Uyqu vaqti" htmlFor="sw-bed">
            <input id="sw-bed" type="time" className="input" value={editBed} onChange={e => setEditBed(e.target.value)} />
          </Field>
          <Field label={`Maqsad: ${fmtDuration(editTarget)}`} htmlFor="sw-target">
            <input id="sw-target" type="range" min={240} max={720} step={15} value={editTarget} onChange={e => setEditTarget(+e.target.value)} className="w-full accent-[#FF633C]" />
          </Field>
          <button onClick={saveSettings} className="btn btn-primary w-full btn-lg">Saqlash</button>
        </div>
      </Modal>
    </div>
  );
}
