"use client";

import { useState, useTransition } from "react";
import { createGoalAction, updateGoalAction } from "@/server/actions/tasks";
import { FieldError, Sheet, Spinner, Toggle } from "@/components/ui";
import { GOAL_CATEGORIES } from "@/lib/goals";

export type GoalDraft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  targetDate: string;
  hasMetric: boolean;
  metricTarget: string;
  metricUnit: string;
};

const EMPTY: GoalDraft = {
  title: "",
  description: "",
  category: "personal",
  targetDate: "",
  hasMetric: false,
  metricTarget: "",
  metricUnit: "",
};

export function GoalSheet({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  /** When set, the sheet edits that goal */
  initial?: GoalDraft | null;
}) {
  const [draft, setDraft] = useState<GoalDraft>(initial ?? EMPTY);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // Re-sync when opening with different initial
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    setDraft(initial ?? EMPTY);
    setError("");
  }

  function patch(p: Partial<GoalDraft>) {
    setDraft((d) => ({ ...d, ...p }));
    setError("");
  }

  function submit() {
    if (!draft.title.trim()) {
      setError("A goal needs a name.");
      return;
    }
    start(async () => {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        category: draft.category as "learning" | "career" | "health" | "personal" | "finance" | "creative" | "other",
        targetDate: draft.targetDate || null,
        metricTarget: draft.hasMetric ? Number(draft.metricTarget) || null : null,
        metricUnit: draft.hasMetric ? draft.metricUnit.trim() || null : null,
      };
      const res = draft.id
        ? await updateGoalAction(draft.id, payload)
        : await createGoalAction(payload);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={draft.id ? "Edit goal" : "New goal"}>
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="goal-title">Goal</label>
          <input
            id="goal-title"
            className="input"
            placeholder="e.g. Learn English to conversational level"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            maxLength={120}
          />
        </div>
        <div>
          <label className="label" htmlFor="goal-desc">
            Description <span className="font-normal text-ink3">(optional)</span>
          </label>
          <textarea
            id="goal-desc"
            className="input min-h-20 resize-none"
            placeholder="Why does this matter to you?"
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            maxLength={500}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="goal-category">Category</label>
            <select
              id="goal-category"
              className="input"
              value={draft.category}
              onChange={(e) => patch({ category: e.target.value })}
            >
              {GOAL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="goal-date">
              Target date <span className="font-normal text-ink3">(optional)</span>
            </label>
            <input
              id="goal-date"
              type="date"
              className="input"
              value={draft.targetDate}
              onChange={(e) => patch({ targetDate: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-[14px] border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-ink">Measurable target</p>
              <p className="mt-0.5 text-[12.5px] text-ink2">
                Track progress in units (e.g. 20 practice sessions)
              </p>
            </div>
            <Toggle
              label="Enable measurable target"
              checked={draft.hasMetric}
              onChange={(v) => patch({ hasMetric: v })}
            />
          </div>
          {draft.hasMetric && (
            <div className="mt-4 grid animate-fade grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="goal-target">Reach a total of</label>
                <input
                  id="goal-target"
                  type="number"
                  min={1}
                  max={100000}
                  className="input"
                  placeholder="20"
                  value={draft.metricTarget}
                  onChange={(e) => patch({ metricTarget: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="goal-unit">Unit</label>
                <input
                  id="goal-unit"
                  className="input"
                  placeholder="sessions"
                  value={draft.metricUnit}
                  onChange={(e) => patch({ metricUnit: e.target.value })}
                  maxLength={24}
                />
              </div>
            </div>
          )}
        </div>

        <FieldError>{error}</FieldError>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={pending}>
            {pending ? <Spinner size={15} /> : draft.id ? "Save changes" : "Create goal"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
