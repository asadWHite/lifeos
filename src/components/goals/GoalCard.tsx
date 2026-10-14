"use client";

import { useState, useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  deleteGoalAction,
  logGoalProgressAction,
  setGoalStatusAction,
} from "@/server/actions/tasks";
import { TaskRow, type TaskView } from "@/components/tasks/TaskRow";
import { InlineTaskAdd } from "@/components/tasks/InlineTaskAdd";
import { ConfirmInline, ProgressBar, StatusPill, Spinner } from "@/components/ui";
import { GoalSheet, type GoalDraft } from "@/components/goals/GoalSheet";
import { friendlyDue } from "@/lib/time";

export type GoalCardModel = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  categoryLabel: string;
  targetDate: string | null;
  status: string;
  source: string;
  metricTarget: number | null;
  metricUnit: string | null;
  metricProgress: number;
  percent: number | null;
  explanation: string;
};

export function GoalCard({
  goal,
  tasks,
  todayIso,
}: {
  goal: GoalCardModel;
  tasks: TaskView[];
  todayIso: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const archived = goal.status === "archived";
  const completed = goal.status === "completed";

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, fallback?: string) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? fallback ?? "Something went wrong.");
    });
  }

  const draft: GoalDraft = {
    id: goal.id,
    title: goal.title,
    description: goal.description ?? "",
    category: goal.category,
    targetDate: goal.targetDate ?? "",
    hasMetric: goal.metricTarget != null,
    metricTarget: goal.metricTarget != null ? String(goal.metricTarget) : "",
    metricUnit: goal.metricUnit ?? "",
  };

  return (
    <div className={`card p-5 transition-opacity ${archived ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={completed ? "green" : archived ? "gray" : "blue"}>
              {completed ? "Completed" : archived ? "Archived" : goal.categoryLabel}
            </StatusPill>
            {goal.source === "lifeos" && (
              <span className="text-[11.5px] font-medium text-accent-ink">Suggested by LIFEOS</span>
            )}
          </div>
          <h3 className="mt-2 truncate text-[16.5px] font-bold tracking-tight text-ink">
            {goal.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button className="icon-btn" onClick={() => setEditing(true)} aria-label={`Edit ${goal.title}`}>
            <Pencil size={15} />
          </button>
          {archived ? (
            <button className="icon-btn" onClick={() => act(() => setGoalStatusAction(goal.id, "active"))} aria-label="Restore goal">
              <ArchiveRestore size={15} />
            </button>
          ) : (
            <button className="icon-btn" onClick={() => act(() => setGoalStatusAction(goal.id, "archived"))} aria-label="Archive goal">
              <Archive size={15} />
            </button>
          )}
        </div>
      </div>

      {goal.metricTarget != null && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            <ProgressBar percent={goal.percent} height={6} />
          </div>
          <span className="text-[13px] font-bold text-accent-ink">{goal.percent}%</span>
        </div>
      )}
      {goal.metricTarget == null && goal.percent != null && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            <ProgressBar percent={goal.percent} height={6} />
          </div>
          <span className="text-[13px] font-bold text-accent-ink">{goal.percent}%</span>
        </div>
      )}
      <p className="mt-2 text-[12px] text-ink3">{goal.explanation}</p>

      {goal.targetDate && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink2">
          <CalendarDays size={12.5} />
          Target: {friendlyDue(goal.targetDate, todayIso)}
        </p>
      )}

      <button
        className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`} />
        {expanded ? "Hide details" : `Tasks & details (${tasks.length})`}
      </button>

      {expanded && (
        <div className="mt-3 animate-fade space-y-4 border-t border-line pt-4">
          {goal.description && (
            <p className="text-[13.5px] leading-relaxed text-ink2">{goal.description}</p>
          )}

          {goal.metricTarget != null && (
            <div className="rounded-[12px] bg-sunken p-4">
              <p className="text-[13px] font-semibold text-ink">
                {goal.metricProgress} of {goal.metricTarget} {goal.metricUnit ?? "steps"}
              </p>
              <p className="mt-0.5 text-[12px] text-ink2">Log real progress — nothing is counted for you.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => act(() => logGoalProgressAction(goal.id, 1))} disabled={pending || completed}>
                  <Plus size={13} /> 1
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => act(() => logGoalProgressAction(goal.id, 5))} disabled={pending || completed}>
                  <Plus size={13} /> 5
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => act(() => logGoalProgressAction(goal.id, -1))} disabled={pending || goal.metricProgress === 0}>
                  <Minus size={13} /> 1
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-[13px] font-semibold text-ink2">Linked tasks</p>
            <div className="mt-1 divide-y divide-line">
              {tasks.length === 0 ? (
                <p className="py-3 text-[13px] text-ink3">
                  No tasks linked yet — progress from tasks starts once you add some.
                </p>
              ) : (
                tasks.map((t) => <TaskRow key={t.id} task={t} todayIso={todayIso} />)
              )}
            </div>
            <div className="pt-2">
              <InlineTaskAdd dueDate={todayIso} goalId={goal.id} placeholder="Add a task toward this goal…" />
            </div>
          </div>

          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <ConfirmInline
                message="Delete this goal? Linked tasks are kept."
                onConfirm={() => act(() => deleteGoalAction(goal.id))}
                onCancel={() => setConfirmingDelete(false)}
                busy={pending}
              />
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink3 transition-colors hover:text-red"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 size={13} />
              Delete goal
            </button>
          )}
          {error && <p className="text-[12.5px] font-medium text-red">{error}</p>}
        </div>
      )}

      <GoalSheet open={editing} onClose={() => setEditing(false)} initial={draft} />
    </div>
  );
}
