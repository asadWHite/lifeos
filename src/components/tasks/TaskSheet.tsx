"use client";
import { useState, useEffect } from "react";
import { Modal, Field, FieldError } from "@/components/ui/index";
import { Storage, generateId, todayDate } from "@/lib/client/storage";
import type { GoalRow } from "@/lib/client/storage";

export function TaskSheet({ open, onClose, onAdded, goals = [], defaultGoalId, defaultDate }: {
  open: boolean; onClose: () => void; onAdded?: () => void;
  goals?: Pick<GoalRow, "id" | "title">[]; defaultGoalId?: string; defaultDate?: string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ?? todayDate());
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [goalId, setGoalId] = useState(defaultGoalId ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setTitle(""); setError(""); setDate(defaultDate ?? todayDate()); setGoalId(defaultGoalId ?? ""); }
  }, [open, defaultDate, defaultGoalId]);

  function save() {
    if (!title.trim()) { setError("Vazifa nomini kiriting"); return; }
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    Storage.saveTask({
      id: generateId(), profileId: pid, goalId: goalId || null,
      title: title.trim(), notes: null, dueDate: date || null,
      priority, durationMinutes: null,
      status: "todo", source: "user", completedAt: null,
      createdAt: new Date().toISOString(),
    });
    onAdded?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Yangi vazifa" size="sm">
      <div className="space-y-4">
        <Field label="Vazifa" htmlFor="t-title">
          <input id="t-title" className="input" autoFocus placeholder="Nima qilish kerak?" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && save()} />
          <FieldError>{error}</FieldError>
        </Field>
        <Field label="Sana" htmlFor="t-date">
          <input id="t-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Muhimlik">
          <div className="flex gap-2">
            {(["low","normal","high"] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)} className={`btn btn-sm flex-1 ${priority===p ? "btn-primary":"btn-ghost"}`}>
                {p === "high" ? "Yuqori" : p === "normal" ? "O'rta" : "Oddiy"}
              </button>
            ))}
          </div>
        </Field>
        {goals.length > 0 && (
          <Field label="Maqsad" htmlFor="t-goal">
            <select id="t-goal" className="input" value={goalId} onChange={e => setGoalId(e.target.value)}>
              <option value="">—</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </Field>
        )}
        <button className="btn btn-primary w-full btn-lg mt-2" onClick={save}>Qo&apos;shish</button>
      </div>
    </Modal>
  );
}
