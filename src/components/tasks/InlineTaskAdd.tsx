"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Storage, generateId, todayDate } from "@/lib/client/storage";

export function InlineTaskAdd({ dueDate, goalId, placeholder, onAdded }: {
  dueDate?: string | null; goalId?: string | null; placeholder?: string; onAdded?: () => void;
}) {
  const [val, setVal] = useState("");
  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const t = val.trim(); if (!t) return;
    const pid = Storage.getCurrentProfileId(); if (!pid) return;
    Storage.saveTask({
      id: generateId(), profileId: pid, goalId: goalId ?? null,
      title: t, notes: null, dueDate: dueDate ?? todayDate(),
      dueTime: null, priority: "normal", category: "general",
      isPriority: false, durationMinutes: null,
      status: "todo", source: "user", completedAt: null, createdAt: new Date().toISOString(),
    });
    setVal(""); onAdded?.();
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="input flex-1" style={{ padding: "10px 14px", fontSize: "0.9rem" }}
        placeholder={placeholder ?? "Vazifa qo'shish…"}
        value={val} onChange={e => setVal(e.target.value)} maxLength={160}
      />
      <button type="submit" disabled={!val.trim()} className="btn btn-primary btn-sm" style={{ aspectRatio: 1, padding: 0, width: 40 }}>
        <Plus size={18} />
      </button>
    </form>
  );
}
