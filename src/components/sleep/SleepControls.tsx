"use client";
import { useState, useEffect } from "react";
import { Moon, Sun, Edit2, Trash2, Check, X } from "lucide-react";
import { Storage, generateId, fmtTime, fmtDuration, type SleepSessionRow } from "@/lib/client/storage";

/** Minutes between two ISO strings */
function minsBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

/** YYYY-MM-DD from ISO */
function isoDate(iso: string) { return iso.slice(0, 10); }

/** Classify sleep status */
export function sleepStatus(durationMins: number, targetMins: number, wakeISO: string, targetWake: string | null) {
  if (durationMins < 120) return "red";
  if (!targetWake) return null;
  const wakeH = new Date(wakeISO).getHours() * 60 + new Date(wakeISO).getMinutes();
  const [th, tm] = targetWake.split(":").map(Number);
  const targetH = th * 60 + tm;
  const diff = wakeH - targetH;
  if (diff <= 30) return "green";
  if (diff <= 90) return "yellow";
  return "red";
}

const STATUS_LABEL: Record<string, string> = {
  green: "O'z vaqtida",
  yellow: "Biroz kech",
  red: "Sifatsiz uyqu",
};
const STATUS_COLOR: Record<string, string> = {
  green: "#3F8065",
  yellow: "#C8943E",
  red: "#C65B55",
};

/* ─── Active session card ─── */
export function ActiveSleepCard({ session, targetWake, onWoke }: {
  session: SleepSessionRow; targetWake: string | null; onWoke: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => setElapsed(minsBetween(session.startedAt, new Date().toISOString()));
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [session.startedAt]);

  return (
    <div className="card-dark rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,99,60,0.15)" }}>
        <Moon size={22} className="text-[#FF633C]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-small text-[var(--c-ink2)] text-label">UYQU BOSHLANDI</p>
        <p className="text-h3 text-[var(--c-soft-white)]">{fmtTime(session.startedAt)} · {fmtDuration(elapsed)} o'tdi</p>
      </div>
      <button onClick={onWoke} className="btn btn-lamp btn-sm flex-shrink-0">
        <Sun size={16} /> Uyg&apos;ondim
      </button>
    </div>
  );
}

/* ─── Sleep history list ─── */
export function SleepHistory({ sessions, targetWake, onChanged }: {
  sessions: SleepSessionRow[];
  targetWake: string | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  function startEdit(s: SleepSessionRow) {
    setEditing(s.id);
    setEditStart(s.startedAt.slice(0, 16));
    setEditEnd((s.endedAt ?? "").slice(0, 16));
  }

  function saveEdit(s: SleepSessionRow) {
    if (!editStart || !editEnd) return;
    const dur = minsBetween(editStart + ":00", editEnd + ":00");
    if (dur < 0 || dur > 1440) return;
    Storage.saveSleep({ ...s, startedAt: new Date(editStart).toISOString(), endedAt: new Date(editEnd).toISOString(), durationMinutes: dur, manual: true });
    setEditing(null);
    onChanged();
  }

  if (sessions.length === 0) return (
    <p className="text-small text-[var(--c-ink2)] text-center py-6">Hali uyqu sessiyalari yo'q</p>
  );

  return (
    <div className="space-y-2">
      {sessions.map(s => {
        const dur = s.durationMinutes ?? 0;
        const status = s.endedAt ? sleepStatus(dur, 480, s.endedAt, targetWake) : null;
        if (editing === s.id) return (
          <div key={s.id} className="card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-label text-[var(--c-ink2)] mb-1">BOSHLANGAN</p><input type="datetime-local" className="input text-sm" value={editStart} onChange={e => setEditStart(e.target.value)} /></div>
              <div><p className="text-label text-[var(--c-ink2)] mb-1">TUGAGAN</p><input type="datetime-local" className="input text-sm" value={editEnd} onChange={e => setEditEnd(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={() => saveEdit(s)}><Check size={14} /> Saqlash</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}><X size={14} /></button>
            </div>
          </div>
        );

        return (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--c-surface2)] group transition-colors">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: status ? STATUS_COLOR[status] : "var(--c-border)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-body">
                <span className="text-label text-[var(--c-ink2)]">{isoDate(s.startedAt)}</span>
                {" "}{fmtTime(s.startedAt)} — {fmtTime(s.endedAt)}
              </p>
              <div className="flex gap-3">
                <span className="text-small text-[var(--c-ink2)]">{fmtDuration(s.durationMinutes)}</span>
                {status && <span className="text-small" style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>}
                {s.manual && <span className="text-small text-[var(--c-ink2)]">· tahrirlangan</span>}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[var(--c-ink2)]" onClick={() => startEdit(s)}><Edit2 size={13} /></button>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[#C65B55]" onClick={() => { Storage.deleteSleep(s.id); onChanged(); }}><Trash2 size={13} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
