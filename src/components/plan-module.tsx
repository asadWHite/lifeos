"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarCheck2, CheckIcon, Flame, ListChecks, Minus, Pencil, Plus, RotateCcw, Search, Sparkles, Target, Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import type { GoalDTO, HabitDTO, TaskDTO } from "@/lib/dto-types";
import { addDays, formatDateHuman, parseTimeToMin, timeLabel } from "@/lib/dates";
import { TaskForm, type GoalOption } from "@/components/task-form";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, ProgressBar, SegmentedControl, Select, Textarea, cn, useToast } from "@/components/ui";

/* ---------------- types ---------------- */
export interface HabitView {
  habit: HabitDTO;
  current: number;
  longest: number;
  doneToday: boolean;
  scheduledToday: boolean;
  week: { date: string; scheduled: boolean; done: boolean }[];
  totalCompletions: number;
}

type PlanTab = "tasks" | "habits" | "goals";
type TaskFilter = "upcoming" | "overdue" | "completed" | "all";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function PlanModule(props: {
  today: string;
  tasks: TaskDTO[];
  habits: HabitView[];
  goals: GoalDTO[];
  goalOptions: GoalOption[];
  suggestedCategories: string[];
  habitSuggestions: { name: string; days: number[] }[];
}) {
  const [tab, setTab] = useState<PlanTab>("tasks");
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold">Plan</h1>
          <p className="mt-1 text-sm text-sub">Tasks, habits and goals — everything that feeds your TimeFlow.</p>
        </div>
        <SegmentedControl
          ariaLabel="Plan sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "tasks", label: "Tasks" },
            { value: "habits", label: "Habits" },
            { value: "goals", label: "Goals" },
          ]}
        />
      </header>
      {tab === "tasks" && <TaskSection {...props} />}
      {tab === "habits" && <HabitSection today={props.today} habits={props.habits} suggestions={props.habitSuggestions} />}
      {tab === "goals" && <GoalSection goals={props.goals} suggestedCategories={props.suggestedCategories} />}
    </div>
  );
}

/* ================= TASKS ================= */
function TaskSection(props: {
  today: string;
  tasks: TaskDTO[];
  goalOptions: GoalOption[];
  suggestedCategories: string[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [filter, setFilter] = useState<TaskFilter>("upcoming");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskDTO | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return props.tasks.filter((t) => {
      if (q && !`${t.title} ${t.description}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "upcoming": return t.status !== "completed" && t.date >= props.today;
        case "overdue": return t.status !== "completed" && t.date < props.today;
        case "completed": return t.status === "completed";
        default: return true;
      }
    });
  }, [props.tasks, filter, query, props.today]);

  const counts = useMemo(() => ({
    upcoming: props.tasks.filter((t) => t.status !== "completed" && t.date >= props.today).length,
    overdue: props.tasks.filter((t) => t.status !== "completed" && t.date < props.today).length,
    completed: props.tasks.filter((t) => t.status === "completed").length,
    all: props.tasks.length,
  }), [props.tasks, props.today]);

  const groups = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const t of visible) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return [...map.entries()].sort(([a], [b]) => (filter === "completed" ? b.localeCompare(a) : a.localeCompare(b)));
  }, [visible, filter]);

  async function toggle(task: TaskDTO) {
    if (busyIds.has(task.id)) return;
    setBusyIds((s) => new Set(s).add(task.id));
    const status = task.status === "completed" ? "pending" : "completed";
    const res = await api(`/api/tasks/${task.id}`, "PATCH", { status });
    setBusyIds((s) => { const n = new Set(s); n.delete(task.id); return n; });
    if (!res.ok) {
      push({ title: "Couldn't update the task", body: res.error ?? undefined, tone: "bad" });
      return;
    }
    for (const a of res.data?.newAchievements ?? []) {
      push({ title: `Achievement unlocked — ${a.title}`, body: a.description, tone: "celebrate" });
    }
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search activities…" aria-label="Search activities" className="pl-10" />
        </div>
        <SegmentedControl
          ariaLabel="Task filter"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "upcoming", label: `Upcoming · ${counts.upcoming}` },
            { value: "overdue", label: `Overdue · ${counts.overdue}` },
            { value: "completed", label: `Done · ${counts.completed}` },
            { value: "all", label: "All" },
          ]}
        />
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" aria-hidden /> New task</Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={filter === "completed" ? "Nothing completed yet" : "No activities here"}
          body={filter === "overdue" ? "Nice — nothing is overdue." : "Create a task and it becomes part of your TimeFlow."}
          action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" aria-hidden /> Add a task</Button>}
        />
      ) : (
        <div className="grid gap-5">
          {groups.map(([date, list]) => (
            <section key={date} aria-label={`Tasks for ${formatDateHuman(date)}`}>
              <h2 className={cn("sticky top-14 z-10 -mx-1 bg-[var(--c-bg)]/85 px-1 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] backdrop-blur-sm", date < props.today ? "text-bad/80" : date === props.today ? "text-accent" : "text-faint")}>
                {date === props.today ? "Today" : formatDateHuman(date, { weekday: true })}
                {date < props.today && " · overdue"}
              </h2>
              <ul className="grid gap-2">
                {list.map((t) => {
                  const isDone = t.status === "completed";
                  return (
                    <li key={t.id} className="card group flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => toggle(t)}
                        disabled={busyIds.has(t.id)}
                        role="checkbox"
                        aria-checked={isDone}
                        aria-label={isDone ? `Reopen ${t.title}` : `Complete ${t.title}`}
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all disabled:opacity-40",
                          isDone ? "border-success bg-success text-white" : "border-[var(--c-line-strong)] text-transparent hover:border-accent hover:text-accent/40",
                        )}
                      >
                        <CheckIcon className="size-3.5" aria-hidden />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-[15px] font-medium", isDone && "text-sub line-through decoration-sub/50")}>{t.title}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-faint">
                          {t.startTime && <span className="tabular-nums">{timeLabel(t.startTime)}{t.endTime ? `–${timeLabel(t.endTime)}` : ""}</span>}
                          <span className="capitalize">{t.category}</span>
                          {t.priority === "high" && <Badge tone="accent">High</Badge>}
                          {t.priority === "low" && <Badge tone="neutral">Low</Badge>}
                        </p>
                      </div>
                      <button
                        onClick={() => { setEditing(t); setFormOpen(true); }}
                        aria-label={`Edit ${t.title}`}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-faint opacity-0 transition-all hover:bg-[var(--c-line)] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={editing} defaultDate={props.today} goals={props.goalOptions} suggestedCategories={props.suggestedCategories} />
    </div>
  );
}

/* ================= HABITS ================= */
function HabitSection({ today, habits, suggestions }: { today: string; habits: HabitView[]; suggestions: { name: string; days: number[] }[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HabitDTO | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "delete" | "archive"; habit: HabitDTO } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  function openForm(habit: HabitDTO | null, preset?: { name: string; days: number[] }) {
    setEditing(habit);
    setName(habit?.name ?? preset?.name ?? "");
    setDescription(habit?.description ?? "");
    setDays(habit?.days ?? preset?.days ?? [0, 1, 2, 3, 4, 5, 6]);
    setError(null);
    setFormOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!name.trim()) return setError("Name the habit first.");
    if (days.length === 0) return setError("Pick at least one day of the week.");
    setPending(true);
    setError(null);
    const payload = { name: name.trim(), description: description.trim(), days };
    const res = editing ? await api(`/api/habits/${editing.id}`, "PATCH", payload) : await api("/api/habits", "POST", payload);
    setPending(false);
    if (!res.ok) return setError(res.error ?? "Could not save the habit.");
    push({ title: editing ? "Habit updated" : "Habit created", tone: "ok" });
    setFormOpen(false);
    router.refresh();
  }

  async function toggleToday(view: HabitView) {
    if (busyIds.has(view.habit.id)) return;
    setBusyIds((s) => new Set(s).add(view.habit.id));
    const res = await api(`/api/habits/${view.habit.id}/complete`, "POST", { date: today, done: !view.doneToday });
    setBusyIds((s) => { const n = new Set(s); n.delete(view.habit.id); return n; });
    if (!res.ok) {
      push({ title: "Couldn't record the habit", body: res.error ?? undefined, tone: "bad" });
      return;
    }
    for (const a of res.data?.newAchievements ?? []) push({ title: `Achievement unlocked — ${a.title}`, body: a.description, tone: "celebrate" });
    router.refresh();
  }

  async function confirmAction() {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    const res = confirm.kind === "delete"
      ? await api(`/api/habits/${confirm.habit.id}`, "DELETE")
      : await api(`/api/habits/${confirm.habit.id}`, "PATCH", { archived: true });
    setConfirmBusy(false);
    setConfirm(null);
    if (!res.ok) return push({ title: "Action failed", body: res.error ?? undefined, tone: "bad" });
    push({ title: confirm.kind === "delete" ? "Habit deleted" : "Habit archived", tone: "info" });
    router.refresh();
  }

  const active = habits.filter((h) => !h.habit.archived);
  const archived = habits.filter((h) => h.habit.archived);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sub">Streaks follow scheduled days only — rest days never break a streak.</p>
        <Button onClick={() => openForm(null)}><Plus className="size-4" aria-hidden /> New habit</Button>
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No habits yet"
          body="Small, scheduled actions compound. Start with one — LifeOS tracks streaks from real completions only."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.slice(0, 3).map((s) => (
                <Button key={s.name} variant="glass" size="sm" onClick={() => openForm(null, s)}><Sparkles className="size-3.5" aria-hidden /> {s.name}</Button>
              ))}
              <Button size="sm" onClick={() => openForm(null)}><Plus className="size-4" aria-hidden /> From scratch</Button>
            </div>
          }
        />
      ) : (
        <ul className="stagger grid gap-3 sm:grid-cols-2">
          {active.map((view) => (
            <li key={view.habit.id} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{view.habit.name}</p>
                  <p className="mt-0.5 text-[12px] text-faint">
                    {view.habit.days.length === 7 ? "Every day" : view.habit.days.slice().sort().map((d) => DAY_NAMES[d].slice(0, 3)).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openForm(view.habit)} aria-label={`Edit ${view.habit.name}`} className="grid size-8 place-items-center rounded-full text-faint hover:bg-[var(--c-line)] hover:text-ink"><Pencil className="size-4" aria-hidden /></button>
                  <button onClick={() => setConfirm({ kind: "archive", habit: view.habit })} aria-label={`Archive ${view.habit.name}`} className="grid size-8 place-items-center rounded-full text-faint hover:bg-[var(--c-line)] hover:text-ink"><Archive className="size-4" aria-hidden /></button>
                  <button onClick={() => setConfirm({ kind: "delete", habit: view.habit })} aria-label={`Delete ${view.habit.name}`} className="grid size-8 place-items-center rounded-full text-faint hover:bg-error/15 hover:text-bad"><Trash2 className="size-4" aria-hidden /></button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[13px]">
                <span className="flex items-center gap-1.5 font-semibold text-accent"><Flame className="size-4" aria-hidden /> {view.current} day{view.current === 1 ? "" : "s"}</span>
                <span className="text-faint">best {view.longest}</span>
                <span className="text-faint">{view.totalCompletions} total</span>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="flex gap-1" aria-label="Last 7 days">
                  {view.week.map((d, i) => (
                    <span
                      key={d.date}
                      title={`${DAY_NAMES[new Date(`${d.date}T12:00:00Z`).getUTCDay()]}: ${d.done ? "done" : d.scheduled ? "missed" : "rest day"}`}
                      className={cn(
                        "grid size-6 place-items-center rounded-md text-[10px] font-semibold",
                        d.done ? "bg-success text-white" : d.scheduled ? (i === 6 ? "border border-accent/60 text-accent" : "bg-[var(--c-line)] text-faint") : "text-faint/50",
                      )}
                    >
                      {DAY_LETTERS[new Date(`${d.date}T12:00:00Z`).getUTCDay()]}
                    </span>
                  ))}
                </div>
                {view.scheduledToday && (
                  <Button size="sm" variant={view.doneToday ? "glass" : "primary"} onClick={() => toggleToday(view)} disabled={busyIds.has(view.habit.id)}>
                    <CheckIcon className="size-3.5" aria-hidden /> {view.doneToday ? "Done today" : "Mark done"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium text-sub">Archived habits ({archived.length})</summary>
          <ul className="mt-3 grid gap-2">
            {archived.map((view) => (
              <li key={view.habit.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-faint hover:bg-[var(--c-line)]">
                <span className="truncate">{view.habit.name}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={async () => { await api(`/api/habits/${view.habit.id}`, "PATCH", { archived: false }); router.refresh(); }}>
                    <RotateCcw className="size-3.5" aria-hidden /> Restore
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "delete", habit: view.habit })}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Habit form */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit habit" : "New habit"}>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Name" htmlFor="hf-name"><Input id="hf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Read 20 minutes" autoFocus /></Field>
          <Field label="Description" htmlFor="hf-desc" optional><Textarea id="hf-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></Field>
          <Field label="Scheduled days">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Days of week">
              {DAY_NAMES.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days.includes(i)}
                  onClick={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))}
                  className={cn(
                    "grid size-10 place-items-center rounded-full border text-[13px] font-semibold transition-colors",
                    days.includes(i) ? "border-accent bg-accent text-white" : "border-[var(--c-line-strong)] text-sub hover:text-ink",
                  )}
                >
                  {d.slice(0, 2)}
                </button>
              ))}
            </div>
          </Field>
          {error && <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-bad">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>{editing ? "Save changes" : "Create habit"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirmAction}
        loading={confirmBusy}
        title={confirm?.kind === "delete" ? "Delete this habit?" : "Archive this habit?"}
        body={
          confirm?.kind === "delete"
            ? `“${confirm?.habit.name}” and its entire completion history will be permanently removed.`
            : `“${confirm?.habit.name}” will pause streak tracking and leave your timeline. History is kept.`
        }
        confirmLabel={confirm?.kind === "delete" ? "Delete" : "Archive"}
      />
    </div>
  );
}

/* ================= GOALS ================= */
function GoalSection({ goals, suggestedCategories }: { goals: GoalDTO[]; suggestedCategories: string[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalDTO | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("personal");
  const [targetDate, setTargetDate] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState<GoalDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openForm(goal: GoalDTO | null) {
    setEditing(goal);
    setTitle(goal?.title ?? "");
    setDescription(goal?.description ?? "");
    setCategory(goal?.category ?? "personal");
    setTargetDate(goal?.targetDate ?? "");
    setTargetValue(goal?.targetValue != null ? String(goal.targetValue) : "");
    setUnit(goal?.unit ?? "");
    setError(null);
    setFormOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!title.trim()) return setError("Give the goal a title.");
    const tv = targetValue.trim() === "" ? null : Number(targetValue);
    if (tv != null && (!Number.isInteger(tv) || tv <= 0)) return setError("Target must be a whole number above zero (or leave empty).");
    setPending(true);
    setError(null);
    const payload = { title: title.trim(), description: description.trim(), category, targetDate: targetDate || null, targetValue: tv, unit: unit.trim() };
    const res = editing ? await api(`/api/goals/${editing.id}`, "PATCH", payload) : await api("/api/goals", "POST", payload);
    setPending(false);
    if (!res.ok) return setError(res.error ?? "Could not save the goal.");
    push({ title: editing ? "Goal updated" : "Goal created", tone: "ok" });
    setFormOpen(false);
    router.refresh();
  }

  async function patchGoal(goal: GoalDTO, payload: Record<string, unknown>, celebrateText?: string) {
    if (busyIds.has(goal.id)) return;
    setBusyIds((s) => new Set(s).add(goal.id));
    const res = await api(`/api/goals/${goal.id}`, "PATCH", payload);
    setBusyIds((s) => { const n = new Set(s); n.delete(goal.id); return n; });
    if (!res.ok) {
      push({ title: "Couldn't update the goal", body: res.error ?? undefined, tone: "bad" });
      return;
    }
    if (celebrateText) push({ title: celebrateText, tone: "celebrate" });
    for (const a of res.data?.newAchievements ?? []) push({ title: `Achievement unlocked — ${a.title}`, body: a.description, tone: "celebrate" });
    router.refresh();
  }

  async function remove() {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    const res = await api(`/api/goals/${confirmDel.id}`, "DELETE");
    setDeleting(false);
    setConfirmDel(null);
    if (!res.ok) return push({ title: "Couldn't delete the goal", body: res.error ?? undefined, tone: "bad" });
    push({ title: "Goal deleted", tone: "info" });
    router.refresh();
  }

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "completed");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sub">Measurable goals complete when the target is genuinely reached — never by date alone.</p>
        <Button onClick={() => openForm(null)}><Plus className="size-4" aria-hidden /> New goal</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" body="Set a realistic target — a language exam, a running total, a savings number — and track it here." action={<Button onClick={() => openForm(null)}><Plus className="size-4" aria-hidden /> Create a goal</Button>} />
      ) : (
        <>
          {active.length > 0 && (
            <ul className="stagger grid gap-3 sm:grid-cols-2">
              {active.map((g) => {
                const pct = g.targetValue ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0;
                return (
                  <li key={g.id} className="card flex flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{g.title}</p>
                        <p className="mt-0.5 text-[12px] text-faint">
                          <span className="capitalize">{g.category}</span>
                          {g.targetDate && <> · by {formatDateHuman(g.targetDate)}</>}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => openForm(g)} aria-label={`Edit ${g.title}`} className="grid size-8 place-items-center rounded-full text-faint hover:bg-[var(--c-line)] hover:text-ink"><Pencil className="size-4" aria-hidden /></button>
                        <button onClick={() => setConfirmDel(g)} aria-label={`Delete ${g.title}`} className="grid size-8 place-items-center rounded-full text-faint hover:bg-error/15 hover:text-bad"><Trash2 className="size-4" aria-hidden /></button>
                      </div>
                    </div>
                    {g.description && <p className="text-[13px] text-sub">{g.description}</p>}
                    {g.targetValue != null ? (
                      <>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-semibold tabular-nums">{g.currentValue} / {g.targetValue} {g.unit}</span>
                          <span className="text-faint tabular-nums">{pct}%</span>
                        </div>
                        <ProgressBar value={pct} label={`Progress of ${g.title}`} />
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="glass" aria-label="Decrease progress" onClick={() => patchGoal(g, { currentValue: Math.max(0, g.currentValue - 1) })}><Minus className="size-3.5" aria-hidden /></Button>
                          <Button size="sm" variant="glass" aria-label="Increase progress" onClick={() => patchGoal(g, { currentValue: g.currentValue + 1 }, g.currentValue + 1 === g.targetValue ? "Goal reached — well done" : undefined)}><Plus className="size-3.5" aria-hidden /></Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-[12px] text-faint">No measurable target — mark it complete when you genuinely get there.</p>
                    )}
                    <Button size="sm" variant="subtle" className="self-start" onClick={() => patchGoal(g, { action: "complete" }, "Goal completed — well done")} disabled={busyIds.has(g.id)}>
                      <CheckIcon className="size-3.5" aria-hidden /> Mark complete
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {done.length > 0 && (
            <section aria-label="Completed goals">
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-faint">Achieved · {done.length}</h2>
              <ul className="grid gap-2">
                {done.map((g) => (
                  <li key={g.id} className="card flex items-center justify-between gap-3 px-4 py-3 opacity-75">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success/20 text-ok"><CheckIcon className="size-3.5" aria-hidden /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{g.title}</p>
                        {g.completedAt && <p className="text-[12px] text-faint">completed {formatDateHuman(g.completedAt.slice(0, 10))}</p>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => patchGoal(g, { action: "reopen" })}><RotateCcw className="size-3.5" aria-hidden /> Reopen</Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit goal" : "New goal"}>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Title" htmlFor="gf-title"><Input id="gf-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Read 12 books this year" autoFocus /></Field>
          <Field label="Why it matters" htmlFor="gf-desc" optional><Textarea id="gf-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="gf-cat">
              <Select id="gf-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                {[...new Set([...suggestedCategories, "work", "health", "study", "personal"])].map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </Select>
            </Field>
            <Field label="Target date" htmlFor="gf-date" optional><Input id="gf-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Measurable target" htmlFor="gf-target" optional hint="e.g. 12 — books to read">
              <Input id="gf-target" inputMode="numeric" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="12" />
            </Field>
            <Field label="Unit" htmlFor="gf-unit" optional hint="e.g. books, km, sessions">
              <Input id="gf-unit" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} placeholder="books" />
            </Field>
          </div>
          {error && <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-bad">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending}>{editing ? "Save changes" : "Create goal"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this goal?"
        body={`“${confirmDel?.title}” and its progress will be permanently removed. Linked tasks stay, but lose the link.`}
      />
    </div>
  );
}
