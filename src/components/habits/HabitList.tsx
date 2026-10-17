"use client";

import { useState } from "react";
import { Plus, Check, Zap, Pencil, Trash2, X } from "lucide-react";
import { Storage, generateId, type HabitRow, type HabitLogRow } from "@/lib/client/storage";
import { Modal, Field, EmptyState } from "@/components/ui/index";

const FREQ_LABELS: Record<string, string> = {
  daily: "Har kuni", weekdays: "Ish kunlari",
  weekends: "Dam olish", custom: "Boshqa",
};

/* Add/edit habit modal */
function HabitModal({ open, onClose, habit, profileId, onSaved }: {
  open: boolean; onClose: () => void;
  habit?: HabitRow; profileId: string; onSaved: () => void;
}) {
  const [title, setTitle] = useState(habit?.title ?? "");
  const [freq, setFreq] = useState<HabitRow["frequency"]>(habit?.frequency ?? "daily");
  const [error, setError] = useState("");

  function save() {
    if (!title.trim()) { setError("Nomi kerak"); return; }
    if (habit) {
      Storage.saveHabit({ ...habit, title: title.trim(), frequency: freq });
    } else {
      Storage.saveHabit({
        id: generateId(), profileId, title: title.trim(), description: null,
        frequency: freq, customDays: [], color: "#FF633C", icon: "zap",
        status: "active", createdAt: new Date().toISOString(),
      });
    }
    onSaved(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={habit ? "Odatni tahrirlash" : "Yangi odat"} size="sm">
      <div className="space-y-4">
        <Field label="Nomi" htmlFor="h-title">
          <input id="h-title" className="input" autoFocus placeholder="Masalan: 10 daqiqa o'qish" value={title} onChange={e => { setTitle(e.target.value); setError(""); }} />
          {error && <p className="text-small text-[#C65B55] mt-1">{error}</p>}
        </Field>
        <Field label="Takrorlash">
          <div className="flex flex-wrap gap-2">
            {(["daily","weekdays","weekends"] as const).map(f => (
              <button key={f} onClick={() => setFreq(f)} className={`btn btn-sm ${freq===f?"btn-primary":"btn-ghost"}`}>{FREQ_LABELS[f]}</button>
            ))}
          </div>
        </Field>
        <button onClick={save} className="btn btn-primary w-full btn-lg">Saqlash</button>
      </div>
    </Modal>
  );
}

export function HabitList({ profileId, habits, logs, today, onChanged }: {
  profileId: string;
  habits: HabitRow[];
  logs: HabitLogRow[];
  today: string;
  onChanged: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<HabitRow | undefined>();
  const [showEdit, setShowEdit] = useState(false);

  function toggle(habit: HabitRow) {
    const existing = Storage.getHabitLogForDate(habit.id, today);
    if (existing) {
      Storage.deleteHabitLog(existing.id);
    } else {
      Storage.saveHabitLog({
        id: generateId(), habitId: habit.id, profileId,
        date: today, createdAt: new Date().toISOString(),
      });
    }
    onChanged();
  }

  function streak(habit: HabitRow): number {
    const allLogs = Storage.getHabitLogs().filter(l => l.habitId === habit.id)
      .map(l => l.date).sort().reverse();
    let count = 0;
    const cursor = new Date(today);
    for (const d of allLogs) {
      const cStr = cursor.toISOString().slice(0,10);
      if (d === cStr) { count++; cursor.setDate(cursor.getDate()-1); }
      else break;
    }
    return count;
  }

  if (habits.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="Odatlar yo'q"
        body="Har kuni bajaradigan odatlarni qo'shing — ular silsilangizni (streak) kuzatib boradi"
        action={<button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">Odat qo'shish</button>}
      />
    );
  }

  return (
    <div className="space-y-3">
      {habits.map(habit => {
        const done = logs.some(l => l.habitId === habit.id && l.date === today);
        const s = streak(habit);
        return (
          <div key={habit.id} className="card flex items-center gap-4">
            <button
              onClick={() => toggle(habit)}
              className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white transition-all ${done ? "" : "border-2 border-[var(--c-border)]"}`}
              style={done ? { background: "#3F8065" } : { background: "transparent" }}
            >
              {done ? <Check size={22} strokeWidth={3} /> : <Zap size={20} style={{ color: "var(--c-ink2)" }} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-body font-semibold ${done ? "line-through text-[var(--c-ink2)]" : ""}`}>{habit.title}</p>
              <p className="text-small text-[var(--c-ink2)]">
                {FREQ_LABELS[habit.frequency]}
                {s > 0 && ` · 🔥 ${s} kun`}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(habit); setShowEdit(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[var(--c-ink2)]"><Pencil size={14} /></button>
              <button onClick={() => { Storage.deleteHabit(habit.id); onChanged(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[#C65B55]"><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}

      <button onClick={() => setShowAdd(true)} className="btn btn-ghost w-full">
        <Plus size={16} /> Odat qo&apos;shish
      </button>

      <HabitModal open={showAdd} onClose={() => setShowAdd(false)} profileId={profileId} onSaved={onChanged} />
      {editing && <HabitModal open={showEdit} onClose={() => setShowEdit(false)} habit={editing} profileId={profileId} onSaved={onChanged} />}
    </div>
  );
}
