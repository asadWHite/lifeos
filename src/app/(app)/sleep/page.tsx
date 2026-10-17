"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, Settings2, Edit2, Trash2, Check, X } from "lucide-react";
import { Storage, generateId, fmtTime, fmtDuration, sleepStatus, defaultPrefs, type SleepSessionRow, type PreferencesRow } from "@/lib/client/storage";
import { Modal, Field } from "@/components/ui/index";

export default function SleepPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PreferencesRow | null>(null);
  const [sessions, setSessions] = useState<SleepSessionRow[]>([]);
  const [active, setActive] = useState<SleepSessionRow | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editWake, setEditWake]   = useState("07:00");
  const [editBed, setEditBed]     = useState("23:00");
  const [editTarget, setEditTarget] = useState(480);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd]     = useState("");

  const reload = useCallback(() => {
    const id = Storage.getCurrentProfileId(); if (!id) return;
    setPid(id);
    const p = Storage.getPrefs(id);
    setPrefs(p);
    setEditWake(p.wakeTime ?? "07:00");
    setEditBed(p.bedtime ?? "23:00");
    setEditTarget(p.sleepTargetMinutes ?? 480);
    const all = Storage.getSleeps(id).sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setActive(all.find(s => !s.endedAt) ?? null);
    setSessions(all.filter(s => s.endedAt));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id || !Storage.getProfile(id)) { router.replace("/welcome"); return; }
    reload();
  }, [router, reload]);

  function startSleep() {
    if (!pid || active) return;
    Storage.saveSleep({ id: generateId(), profileId: pid, startedAt: new Date().toISOString(), endedAt: null, durationMinutes: null, manual: false, phoneBeforeBed: null, phoneAfterWake: null, createdAt: new Date().toISOString() });
    reload();
  }

  function endSleep() {
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
    setShowSettings(false); reload();
  }

  function saveEdit(s: SleepSessionRow) {
    if (!editStart || !editEnd) return;
    const start = new Date(editStart); const end = new Date(editEnd);
    const dur = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    Storage.saveSleep({ ...s, startedAt: start.toISOString(), endedAt: end.toISOString(), durationMinutes: dur, manual: true });
    setEditingId(null); reload();
  }

  if (!mounted || !prefs) return null;

  const statusColor = { green: "#3F8065", yellow: "#C8943E", red: "#C65B55" };
  const statusLabel = { green: "O'z vaqtida 🟢", yellow: "Biroz kech 🟡", red: "Kam uyqu 🔴" };
  const lastSession = sessions[0];
  const lastStatus = lastSession ? sleepStatus(lastSession, prefs) : null;

  return (
    <div className="pb-nav" style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      <div style={{ padding: "48px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, maxWidth: 640, margin: "0 auto 24px" }}>
          <div><h1 className="t-h1">Uyqu</h1><p style={{ color: "var(--ink2)", fontSize: "0.875rem", marginTop: 4 }}>Uyqu rejimi va tahlil</p></div>
          <button onClick={() => setShowSettings(true)} className="btn btn-ghost btn-sm"><Settings2 size={16} /> Sozlash</button>
        </div>

        {/* Main Sleep Card */}
        <div className="card-dark" style={{ maxWidth: 640, margin: "0 auto 20px", padding: 28, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.06 }}>
            <Moon size={160} />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            {active ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF633C", boxShadow: "0 0 8px #FF633C" }} />
                  <span style={{ color: "#ADA996", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Uyqu sessiyasi faol</span>
                </div>
                <p style={{ fontSize: "2rem", fontWeight: 800, color: "#F2F2F2" }}>{fmtTime(active.startedAt)}</p>
                <p style={{ color: "#ADA996", fontSize: "0.875rem", marginTop: 4 }}>dan boshlandi</p>
                <button onClick={endSleep} className="btn btn-lamp" style={{ marginTop: 20, width: "100%" }}>
                  <Sun size={18} /> Uyg&apos;ondim
                </button>
              </>
            ) : (
              <>
                {lastSession && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ color: "#ADA996", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>KECHA UYQU</p>
                    <p style={{ fontSize: "2.8rem", fontWeight: 800, color: "#F2F2F2", lineHeight: 1 }}>{fmtDuration(lastSession.durationMinutes)}</p>
                    {lastStatus && <span className="tag tag-dark" style={{ marginTop: 8, display: "inline-block", color: statusColor[lastStatus] }}>{statusLabel[lastStatus]}</span>}
                    <p style={{ color: "#ADA996", fontSize: "0.8rem", marginTop: 8 }}>Maqsad: {fmtDuration(prefs.sleepTargetMinutes)}</p>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 16px" }}>
                    <p style={{ color: "#ADA996", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>UXLASH</p>
                    <p style={{ color: "#F2F2F2", fontWeight: 700, fontSize: "1.2rem", marginTop: 4 }}>{prefs.bedtime ?? "—"}</p>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 16px" }}>
                    <p style={{ color: "#ADA996", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>UYG'ONISH</p>
                    <p style={{ color: "#F2F2F2", fontWeight: 700, fontSize: "1.2rem", marginTop: 4 }}>{prefs.wakeTime ?? "—"}</p>
                  </div>
                </div>
                <button onClick={startSleep} className="btn btn-primary" style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F2F2" }}>
                  <Moon size={18} /> Uyquni boshlash
                </button>
              </>
            )}
          </div>
        </div>

        {/* 7-day chart */}
        {sessions.length > 0 && (
          <div className="card" style={{ maxWidth: 640, margin: "0 auto 20px", padding: 20 }}>
            <p className="t-label" style={{ color: "var(--ink2)", marginBottom: 16 }}>7 KUNLIK TREND</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                const dayStr = d.toISOString().slice(0, 10);
                const s = sessions.find(x => x.startedAt.slice(0, 10) === dayStr);
                const dur = s?.durationMinutes ?? 0;
                const max = Math.max(prefs.sleepTargetMinutes ?? 480, ...sessions.map(x => x.durationMinutes ?? 0));
                const h = dur > 0 ? Math.max(8, (dur / max) * 72) : 4;
                const st = s ? sleepStatus(s, prefs) : null;
                const bg = st === "green" ? "#3F8065" : st === "yellow" ? "#C8943E" : st === "red" ? "#C65B55" : "var(--border)";
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", maxWidth: 28, height: h, background: bg, borderRadius: 6, transition: "height 0.5s" }} />
                    <span className="t-xs" style={{ color: "var(--ink2)" }}>{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              {[["#3F8065","O'z vaqtida"],["#C8943E","Biroz kech"],["#C65B55","Kam uyqu"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span className="t-xs" style={{ color: "var(--ink2)" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {sessions.length > 0 && (
          <div className="card" style={{ maxWidth: 640, margin: "0 auto 20px", padding: "16px 0" }}>
            <p className="t-label" style={{ color: "var(--ink2)", padding: "0 16px 12px" }}>TARIX</p>
            {sessions.slice(0, 10).map(s => {
              const st = sleepStatus(s, prefs);
              if (editingId === s.id) return (
                <div key={s.id} style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div><p className="t-xs" style={{ color: "var(--ink2)", marginBottom: 4 }}>BOSHLANGAN</p>
                      <input type="datetime-local" className="input" style={{ padding: "8px 12px", fontSize: "0.8rem" }} value={editStart} onChange={e => setEditStart(e.target.value)} /></div>
                    <div><p className="t-xs" style={{ color: "var(--ink2)", marginBottom: 4 }}>TUGAGAN</p>
                      <input type="datetime-local" className="input" style={{ padding: "8px 12px", fontSize: "0.8rem" }} value={editEnd} onChange={e => setEditEnd(e.target.value)} /></div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(s)}><Check size={13} /> Saqlash</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}><X size={13} /></button>
                  </div>
                </div>
              );
              return (
                <div key={s.id} className="group" style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12, borderTop: "1px solid var(--border)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: st ? statusColor[st] : "var(--border)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>{fmtDuration(s.durationMinutes)}</p>
                    <p className="t-xs" style={{ color: "var(--ink2)" }}>{fmtTime(s.startedAt)} — {fmtTime(s.endedAt)} · {new Date(s.startedAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}{s.manual ? " (tahrirlangan)" : ""}</p>
                  </div>
                  <div style={{ display: "flex", gap: 4 }} className="group-hover-show">
                    <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => { setEditingId(s.id); setEditStart(new Date(s.startedAt).toISOString().slice(0,16)); setEditEnd(s.endedAt ? new Date(s.endedAt).toISOString().slice(0,16) : ""); }}><Edit2 size={13} /></button>
                    <button className="btn-icon" style={{ width: 30, height: 30, color: "var(--error)" }} onClick={() => { Storage.deleteSleep(s.id); reload(); }}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Uyqu sozlamalari" size="sm">
        <div className="space-y-4">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Uyg'onish" htmlFor="sw-wake">
              <input id="sw-wake" type="time" className="input" value={editWake} onChange={e => setEditWake(e.target.value)} />
            </Field>
            <Field label="Uxlash" htmlFor="sw-bed">
              <input id="sw-bed" type="time" className="input" value={editBed} onChange={e => setEditBed(e.target.value)} />
            </Field>
          </div>
          <Field label={`Maqsad: ${fmtDuration(editTarget)}`} htmlFor="sw-tgt">
            <input type="range" id="sw-tgt" min={240} max={720} step={15} value={editTarget} onChange={e => setEditTarget(+e.target.value)} style={{ width: "100%", accentColor: "var(--lamp-orange)" }} />
          </Field>
          <button className="btn btn-primary w-full btn-lg" onClick={saveSettings}>Saqlash</button>
        </div>
      </Modal>
    </div>
  );
}
