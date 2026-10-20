"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import type { TaskDTO } from "@/lib/dto";
import { Button, ConfirmDialog, Field, Input, Modal, Select, SegmentedControl, Textarea, useToast } from "@/components/ui";
import { CATEGORIES, PRIORITIES } from "@/lib/validation";

const CATEGORY_LABELS: Record<string, string> = {
  personal: "Personal", work: "Work", study: "Study", health: "Health", fitness: "Fitness",
  family: "Family", creative: "Creative", social: "Social", errands: "Errands",
};

export interface GoalOption {
  id: string;
  title: string;
}

export function TaskForm({
  open,
  onClose,
  task,
  defaultDate,
  goals,
  suggestedCategories,
}: {
  open: boolean;
  onClose: () => void;
  task: TaskDTO | null;
  defaultDate: string;
  goals: GoalOption[];
  suggestedCategories?: string[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const editing = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [category, setCategory] = useState("personal");
  const [goalId, setGoalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset state from the record each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDate(task?.date ?? defaultDate);
    setStartTime(task?.startTime ?? "");
    setEndTime(task?.endTime ?? "");
    setPriority((task?.priority as (typeof PRIORITIES)[number]) ?? "medium");
    setCategory(task?.category ?? suggestedCategories?.[0] ?? "personal");
    setGoalId(task?.goalId ?? "");
    setError(null);
    setPending(false);
  }, [open, task, defaultDate, suggestedCategories]);

  const categoryOptions = [...new Set([...(suggestedCategories ?? []), ...CATEGORIES])];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return; // duplicate-submission guard
    if (!title.trim()) {
      setError("Give the activity a title — it can't be empty.");
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      setError("End time must be after the start time.");
      return;
    }
    setPending(true);
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      priority,
      category,
      goalId: goalId || null,
    };
    const res = editing
      ? await api<{ task: TaskDTO }>(`/api/tasks/${task!.id}`, "PATCH", payload)
      : await api<{ task: TaskDTO }>("/api/tasks", "POST", payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save. Your changes are still here — try again.");
      return; // input preserved
    }
    push({ title: editing ? "Activity updated" : "Added to your flow", tone: "ok" });
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!task || deleting) return;
    setDeleting(true);
    const res = await api(`/api/tasks/${task.id}`, "DELETE");
    setDeleting(false);
    setConfirmDelete(false);
    if (!res.ok) {
      setError(res.error ?? "Could not delete this activity.");
      return;
    }
    push({ title: "Activity deleted", tone: "info" });
    onClose();
    router.refresh();
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? "Edit activity" : "New activity"}>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Title" htmlFor="tf-title">
            <Input id="tf-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Math revision" maxLength={140} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="tf-date">
              <Input id="tf-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Start" htmlFor="tf-start" optional>
              <Input id="tf-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="End" htmlFor="tf-end" optional>
              <Input id="tf-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Priority">
            <SegmentedControl
              ariaLabel="Priority"
              value={priority}
              onChange={setPriority}
              options={PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="tf-cat">
              <Select id="tf-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                ))}
              </Select>
            </Field>
            {goals.length > 0 && (
              <Field label="Linked goal" htmlFor="tf-goal" optional>
                <Select id="tf-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="">None</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          <Field label="Notes" htmlFor="tf-desc" optional>
            <Textarea id="tf-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Any details worth remembering…" />
          </Field>

          {error && (
            <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-bad">
              {error}
            </p>
          )}

          <div className="mt-1 flex items-center justify-between gap-2">
            {editing ? (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} disabled={pending}>
                <Trash2 className="size-4" aria-hidden /> Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
              <Button type="submit" loading={pending}>{editing ? "Save changes" : "Add activity"}</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this activity?"
        body={`“${task?.title}” will be removed from your timeline, planner and statistics. This can't be undone.`}
      />
    </>
  );
}
