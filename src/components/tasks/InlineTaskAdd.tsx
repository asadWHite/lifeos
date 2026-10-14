"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { createTaskAction } from "@/server/actions/tasks";
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
    start(async () => {
      const res = await createTaskAction({
        title: t,
        dueDate,
        priority: "normal",
        goalId: goalId ?? null,
      });
      if (res.ok) {
        setTitle("");
        setError("");
      } else setError(res.error);
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
