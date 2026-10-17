"use client";

import { useState } from "react";
import { Modal, Field } from "@/components/ui/index";
import { Storage, generateId, type GoalRow } from "@/lib/client/storage";

const REPEAT_OPTIONS = [
  { id: "once",     label: "Bir marta"   },
  { id: "daily",    label: "Har kuni"    },
  { id: "weekdays", label: "Ish kunlari" },
  { id: "weekends", label: "Dam olish"   },
];

const DURATION_OPTIONS = [
  { v: 5,  l: "5 daqiqa"  },
  { v: 10, l: "10 daqiqa" },
  { v: 15, l: "15 daqiqa" },
  { v: 20, l: "20 daqiqa" },
  { v: 25, l: "25 daqiqa (Pomodoro)" },
  { v: 30, l: "30 daqiqa" },
  { v: 45, l: "45 daqiqa" },
  { v: 60, l: "1 soat"    },
];

export function ScheduleModal({ open, onClose, goals, profileId, onSaved }: {
  open: boolean; onClose: () => void;
  goals: GoalRow[]; profileId: string;
  onSaved: () => void;
}) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [time, setTime] = useState("20:00");
  const [date, setDate] = useState(now.toISOString().slice(0,10));
  const [repeat, setRepeat] = useState<"once"|"daily"|"weekdays"|"weekends">("once");
  const [duration, setDuration] = useState(20);
  const [error, setError] = useState("");

  function save() {
    if (!goalId) { setError("Maqsad tanlang"); return; }
    if (!time)   { setError("Vaqt kiriting"); return; }
    const [h, m] = time.split(":").map(Number);
    const scheduled = new Date(repeat === "once" ? date : now.toISOString().slice(0,10));
    scheduled.setHours(h, m, 0, 0);

    Storage.saveScheduledGoal({
      id: generateId(),
      profileId,
      goalId,
      scheduledAt: scheduled.toISOString(),
      duration,
      repeat,
      repeatDays: [],
      state: "idle",
      snoozeUntil: null,
      completedAt: null,
      missedAt: null,
      note: null,
      createdAt: new Date().toISOString(),
    });
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Lamp rejasi">
      <div className="space-y-5">
        <Field label="Maqsad" htmlFor="sg-goal">
          <select id="sg-goal" className="input" value={goalId} onChange={e => setGoalId(e.target.value)}>
            {goals.length === 0
              ? <option value="">Avval maqsad qo'apos;shing</option>
              : goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Vaqt" htmlFor="sg-time">
            <input id="sg-time" type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
          </Field>
          {repeat === "once" && (
            <Field label="Sana" htmlFor="sg-date">
              <input id="sg-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} />
            </Field>
          )}
        </div>

        <Field label="Davomiylik" htmlFor="sg-dur">
          <select id="sg-dur" className="input" value={duration} onChange={e => setDuration(+e.target.value)}>
            {DURATION_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </Field>

        <Field label="Takrorlash">
          <div className="flex flex-wrap gap-2">
            {REPEAT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setRepeat(o.id as typeof repeat)} className={`btn btn-sm ${repeat === o.id ? "btn-primary" : "btn-ghost"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-small text-[#C65B55]">{error}</p>}
        <button onClick={save} className="btn btn-lamp w-full btn-lg mt-2">Lamp rejasini saqlash</button>
      </div>
    </Modal>
  );
}
