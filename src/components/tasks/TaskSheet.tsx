"use client";
import { useEffect, useState } from "react";
import { Modal, Field, FieldError } from "@/components/ui/index";
import { Storage, generateId, todayDate, type GoalRow } from "@/lib/client/storage";

export function TaskSheet({ open, onClose, onAdded, goals = [], defaultGoalId, defaultDate }: {
  open: boolean; onClose: () => void; onAdded?: () => void;
  goals?: Pick<GoalRow, "id" | "title">[]; defaultGoalId?: string; defaultDate?: string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ?? todayDate());
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [isPriority, setIsPriority] = useState(false);
  const [goalId, setGoalId] = useState(defaultGoalId ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setTitle(""); setError(""); setDate(defaultDate ?? todayDate()); setGoalId(defaultGoalId ?? ""); setIsPriority(false); }
  }, [open, defaultDate, defaultGoalId]);

  function save() {
    if (!title.trim()) { setError("Vazifa nomini kiriting"); return; }
    const pid = Storage.getCurrentProfileId(); if (!pid) return;
    Storage.saveTask({
      id: generateId(), profileId: pid, goalId: goalId || null,
      title: title.trim(), notes: null, dueDate: date || null,
      dueTime: null, priority, category: "general", isPriority,
      durationMinutes: null, status: "todo", source: "user",
      completedAt: null, createdAt: new Date().toISOString(),
    });
    onAdded?.(); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Yangi vazifa" size="sm">
      <div className="space-y-4">
        <Field label="Vazifa" htmlFor="t-title">
          <input id="t-title" className="input" autoFocus placeholder="Nima qilish kerak?" value={title}
            onChange={e => { setTitle(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && save()} />
          <FieldError>{error}</FieldError>
        </Field>
        <Field label="Sana" htmlFor="t-date">
          <input id="t-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Muhimlik">
          <div style={{ display: "flex", gap: 8 }}>
            {(["low","normal","high"] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)} className={`btn btn-sm flex-1 ${priority===p?"btn-primary":"btn-ghost"}`}>
                {p==="high"?"Yuqori":p==="normal"?"O'rta":"Past"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="">
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={isPriority} onChange={e => setIsPriority(e.target.checked)} />
            <span className="t-sm">Bugungi ustuvor vazifa (streak uchun)</span>
          </label>
        </Field>
        {goals.length > 0 && (
          <Field label="Maqsad" htmlFor="t-goal">
            <select id="t-goal" className="input" value={goalId} onChange={e => setGoalId(e.target.value)}>
              <option value="">— (maqsadsiz)</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </Field>
        )}
        <button className="btn btn-primary w-full btn-lg" onClick={save}>Qo&apos;shish</button>
      </div>
    </Modal>
  );
}
