"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Plus, X, Clock, Target, AlertCircle } from "lucide-react";
import { Storage, generateId } from "@/lib/client/storage";
import { FieldError, Sheet, Spinner } from "@/components/ui";

export type GoalOption = { id: string; title: string };

type When = "today" | "tomorrow" | "pick" | "none";

function isoFor(when: When, picked: string): string | null {
  if (when === "none") return null;
  if (when === "pick") return picked || null;
  const d = new Date();
  if (when === "tomorrow") d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DURATIONS = [
  { value: "", label: "Taxminiy vaqt yo'q" },
  { value: "10", label: "10 daqiqa" },
  { value: "15", label: "15 daqiqa" },
  { value: "25", label: "25 daqiqa" },
  { value: "30", label: "30 daqiqa" },
  { value: "45", label: "45 daqiqa" },
  { value: "60", label: "1 soat" },
  { value: "90", label: "1.5 soat" },
  { value: "120", label: "2 soat" },
];

export function TaskSheet({
  open,
  onClose,
  goals,
  defaultGoalId,
  defaultWhen = "today",
}: {
  open: boolean;
  onClose: () => void;
  goals: GoalOption[];
  defaultGoalId?: string | null;
  defaultWhen?: When;
}) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<When>(defaultWhen);
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [duration, setDuration] = useState("");
  const [goalId, setGoalId] = useState(defaultGoalId ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle("");
      setWhen(defaultWhen);
      setDate("");
      setPriority("normal");
      setDuration("");
      setGoalId(defaultGoalId ?? "");
      setError("");
    }
  }

  function submit() {
    if (!title.trim()) {
      setError("Vazifa nomini kiriting.");
      return;
    }
    start(() => {
      const pid = Storage.getCurrentProfileId();
      if (!pid) return;
      Storage.saveTask({
        id: generateId(), profileId: pid, title: title.trim(),
        dueDate: isoFor(when, date), priority, durationMinutes: duration ? Number(duration) : null,
        goalId: goalId || null, source: "user", notes: null, status: "todo",
        completedAt: null, createdAt: new Date()
      });
      onClose();
      window.location.reload();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Yangi vazifa">
      <div className="space-y-6 pt-2">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Nima qilamiz?</label>
          <input
            className="w-full bg-bg border border-border rounded-2xl p-4 text-ink focus:outline-none focus:border-brand-silver transition-colors"
            placeholder="Vazifa nomi..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            maxLength={160}
          />
        </div>

        <div className="space-y-3">
          <span className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Qachon?</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["today", "Bugun"],
                ["tomorrow", "Ertaga"],
                ["pick", "Tanlash"],
                ["none", "Vaqtsiz"],
              ] as Array<[When, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  when === value 
                  ? 'bg-brand-dark border-brand-dark text-brand-light shadow-metallic' 
                  : 'bg-white border-border text-ink-muted hover:border-brand-silver'
                }`}
                onClick={() => setWhen(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {when === "pick" && (
            <input
              type="date"
              className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Muhimlik</label>
              <div className="flex gap-2">
                {["low", "normal", "high"].map((p: any) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border ${
                      priority === p 
                      ? (p === 'high' ? 'bg-red-500 border-red-500 text-white' : 'bg-brand-dark border-brand-dark text-brand-light')
                      : 'bg-white border-border text-ink-muted'
                    }`}
                  >
                    {p === 'low' ? 'Past' : p === 'normal' ? 'O\'rta' : 'Yuqori'}
                  </button>
                ))}
              </div>
           </div>
           
           <div className="space-y-2">
             <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Taxminiy vaqt</label>
             <select
                className="w-full bg-bg border border-border rounded-xl p-2 text-sm focus:outline-none"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
           </div>
        </div>

        {goals.length > 0 && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Maqsad bilan bog'lash</label>
            <div className="flex items-center gap-3 bg-bg border border-border rounded-xl p-2">
               <Target size={16} className="text-brand-silver ml-2" />
               <select
                className="flex-1 bg-transparent text-sm focus:outline-none"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
              >
                <option value="">Maqsadsiz</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <FieldError>{error}</FieldError>

        <button 
          className="btn-primary w-full h-14 mt-4" 
          onClick={submit} 
          disabled={pending}
        >
          {pending ? <Spinner size={20} /> : <Plus size={20} className="mr-2" />}
          Vazifa qo'shish
        </button>
      </div>
    </Sheet>
  );
}
