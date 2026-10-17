"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Storage, generateId, todayDate } from "@/lib/client/storage";

export function InlineTaskAdd({ dueDate, goalId, placeholder, onAdded }: {
  dueDate?: string | null;
  goalId?: string | null;
  placeholder?: string;
  onAdded?: () => void;
}) {
  const [val, setVal] = useState("");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const t = val.trim();
    if (!t) return;
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    Storage.saveTask({
      id: generateId(), profileId: pid, goalId: goalId ?? null,
      title: t, notes: null, dueDate: dueDate ?? todayDate(),
      priority: "normal", durationMinutes: null,
      status: "todo", source: "user", completedAt: null,
      createdAt: new Date().toISOString(),
    });
    setVal("");
    onAdded?.();
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="input flex-1 py-2.5"
        placeholder={placeholder ?? "Vazifa qo'shish…"}
        value={val}
        onChange={e => setVal(e.target.value)}
        maxLength={160}
      />
      <button type="submit" disabled={!val.trim()} className="btn btn-sm btn-primary aspect-square !px-0 w-10 h-10 flex-shrink-0">
        <Plus size={18} />
      </button>
    </form>
  );
}
