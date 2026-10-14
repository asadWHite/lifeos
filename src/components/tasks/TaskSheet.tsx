"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { createTaskAction } from "@/server/actions/tasks";
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
  { value: "", label: "No estimate" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "25", label: "25 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
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

  // Reset the form when the sheet opens (adjust-state-during-render pattern)
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
      setError("Give the task a title.");
      return;
    }
    start(async () => {
      const res = await createTaskAction({
        title: title.trim(),
        dueDate: isoFor(when, date),
        priority,
        durationMinutes: duration ? Number(duration) : null,
        goalId: goalId || null,
      });
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="New task">
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="task-title">
            Task
          </label>
          <input
            id="task-title"
            className="input"
            placeholder="What needs doing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            maxLength={160}
          />
        </div>

        <div>
          <span className="label">When</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Due date">
            {(
              [
                ["today", "Today"],
                ["tomorrow", "Tomorrow"],
                ["pick", "Pick a date"],
                ["none", "No date"],
              ] as Array<[When, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="chip"
                data-selected={when === value}
                onClick={() => setWhen(value)}
              >
                {value === "pick" && <CalendarDays size={14} aria-hidden />}
                {label}
              </button>
            ))}
          </div>
          {when === "pick" && (
            <input
              type="date"
              className="input mt-3"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Choose a date"
            />
          )}
        </div>

        <div>
          <span className="label">Priority</span>
          <div className="flex gap-2" role="group" aria-label="Priority">
            {(["low", "normal", "high"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className="chip capitalize"
                data-selected={priority === p}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="task-duration">
              Estimated time
            </label>
            <select
              id="task-duration"
              className="input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          {goals.length > 0 && (
            <div>
              <label className="label" htmlFor="task-goal">
                Goal (optional)
              </label>
              <select
                id="task-goal"
                className="input"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <FieldError>{error}</FieldError>

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={pending}>
            {pending ? <Spinner size={15} /> : <Plus size={16} />}
            Add task
          </button>
        </div>
      </div>
    </Sheet>
  );
}
