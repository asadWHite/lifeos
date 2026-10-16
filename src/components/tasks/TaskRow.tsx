"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Sparkles, Sprout, Trash2 } from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { ConfirmInline, FieldError, Spinner } from "@/components/ui";
import { formatDuration, friendlyDue } from "@/lib/time";

export type TaskView = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: string;
  durationMinutes: number | null;
  status: string;
  source: string;
  goalId: string | null;
};

export function TaskRow({
  task,
  todayIso,
  goalTitle,
}: {
  task: TaskView;
  todayIso: string;
  goalTitle?: string | null;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [done, setDone] = useState(task.status === "done");
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [priority, setPriority] = useState<string>(task.priority);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const overdue = !done && task.dueDate != null && task.dueDate < todayIso;
  const dueLabel = friendlyDue(task.dueDate, todayIso);

  function toggle() {
    const next = !done;
    setDone(next); // optimistic
    start(() => {
      const t = Storage.getTasks().find(x => x.id === task.id);
      if (t) {
        Storage.saveTask({ ...t, status: next ? "done" : "todo", completedAt: next ? new Date() : null });
        window.location.reload();
      }
    });
  }

  function save() {
    if (!title.trim()) {
      setError("Title can't be empty.");
      return;
    }
    start(() => {
      const t = Storage.getTasks().find(x => x.id === task.id);
      if (t) {
        Storage.saveTask({ ...t, title: title.trim(), dueDate: dueDate || null, priority: priority as "low" | "normal" | "high" });
        setMode("view");
        window.location.reload();
      }
    });
  }

  function remove() {
    start(() => {
      Storage.deleteTask(task.id);
      setMode("view");
      window.location.reload();
    });
  }

  if (mode === "delete") {
    return (
      <div className="flex items-center justify-between gap-3 py-3 min-h-12">
        <span className="truncate text-[14.5px] text-ink2 line-through">{task.title}</span>
        <ConfirmInline onConfirm={remove} onCancel={() => setMode("view")} busy={pending} />
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div className="py-3 space-y-3">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          aria-label="Task title"
          maxLength={160}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="input max-w-44"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Due date"
          />
          <div className="flex gap-1.5" role="group" aria-label="Priority">
            {(["low", "normal", "high"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`chip !px-3 !py-1.5 text-xs capitalize`}
                data-selected={priority === p}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="chip !px-3 !py-1.5 text-xs"
              data-selected={dueDate === ""}
              onClick={() => setDueDate("")}
            >
              No date
            </button>
          </div>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex gap-2">
          <button className="btn btn-sm btn-primary" onClick={save} disabled={pending}>
            {pending ? <Spinner size={13} /> : "Save"}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => { setMode("view"); setError(""); }} disabled={pending}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 py-2.5 min-h-12">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={done}
        aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
        className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 ${
          done
            ? "border-accent bg-accent text-white"
            : "border-line-strong hover:border-accent"
        } ${task.priority === "high" && !done ? "border-red/60" : ""}`}
      >
        {done && <Check size={13} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[14.5px] font-medium leading-snug transition-colors ${
            done ? "text-ink3 line-through" : "text-ink"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-ink3">
          {dueLabel && (
            <span className={overdue ? "font-semibold text-red" : ""}>{dueLabel}</span>
          )}
          {task.priority === "high" && !done && <span className="font-semibold text-red">High priority</span>}
          {task.priority === "low" && !done && <span>Low</span>}
          {task.durationMinutes != null && <span>{formatDuration(task.durationMinutes)}</span>}
          {goalTitle && <span className="truncate">→ {goalTitle}</span>}
          {task.source === "lifeos" && (
            <span className="inline-flex items-center gap-1 text-accent-ink">
              <Sprout size={11} /> Suggested by LIFEOS
            </span>
          )}
          {task.source === "assistant" && (
            <span className="inline-flex items-center gap-1 text-info">
              <Sparkles size={11} /> From assistant
            </span>
          )}
        </div>
        {error && <FieldError>{error}</FieldError>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
        <button className="icon-btn" onClick={() => setMode("edit")} aria-label={`Edit “${task.title}”`}>
          <Pencil size={15} />
        </button>
        <button className="icon-btn hover:!text-red" onClick={() => setMode("delete")} aria-label={`Delete “${task.title}”`}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
