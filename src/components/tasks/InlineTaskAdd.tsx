"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Storage, generateId } from "@/lib/client/storage";
import { Spinner } from "@/components/ui";

/** One-keystroke task creation — used on Home. No ceremony required. */
export function InlineTaskAdd({
  dueDate,
  goalId,
  placeholder = "Add a task for today…",
}: {
  dueDate: string | null;
  goalId?: string | null;
  placeholder?: string;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    start(() => {
      const pid = Storage.getCurrentProfileId();
      if (!pid) return;
      Storage.saveTask({
        id: generateId(), profileId: pid, title: t,
        priority: "normal", durationMinutes: null, dueDate,
        source: "user", notes: null, status: "todo",
        goalId: goalId ?? null, completedAt: null, createdAt: new Date()
      });
      setTitle("");
      setError("");
      // simple hard reload to update UI since we bypassed server actions
      window.location.reload();
    });
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong bg-transparent px-3 py-2 transition-colors focus-within:border-accent focus-within:bg-surface">
        <Plus size={16} className="shrink-0 text-ink3" aria-hidden />
        <label className="sr-only" htmlFor={`quick-add-${dueDate ?? "none"}-${goalId ?? "none"}`}>
          {placeholder}
        </label>
        <input
          id={`quick-add-${dueDate ?? "none"}-${goalId ?? "none"}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          maxLength={160}
          className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink3"
        />
        {pending && <Spinner size={15} className="text-ink3" />}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-red">
          {error}
        </p>
      )}
    </form>
  );
}
