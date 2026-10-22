"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BedDouble, CheckIcon, MoonStar, Pencil, Plus, Waves } from "lucide-react";
import { api } from "@/lib/client-api";
import type { HabitDTO, SleepScheduleDTO, SleepSessionDTO, TaskDTO } from "@/lib/dto-types";
import { formatDuration, parseTimeToMin, timeLabel, weekdayOf } from "@/lib/dates";
import { isOverdueWithinDay, pickCurrentActivity, pickNextActivity, sortForTimeline } from "@/lib/stats";
import { STATUS_LABEL, type SleepStatus } from "@/lib/sleep";
import { TaskForm, type GoalOption } from "@/components/task-form";
import { Badge, Button, EmptyState, ProgressBar, cn, useToast } from "@/components/ui";

function useClock(timezone: string, initialMin: number) {
  const [nowMin, setNowMin] = useState(initialMin);
  const [clock, setClock] = useState("--:--");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hm = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
      setClock(hm);
      setNowMin(Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)));
    };
    update();
    const id = setInterval(update, 15_000);
    return () => clearInterval(id);
  }, [timezone]);
  return { nowMin, clock };
}

const STATUS_TONE: Record<SleepStatus, "ok" | "warn" | "bad" | "neutral"> = {
  green: "ok", yellow: "warn", red: "bad", none: "neutral",
};

export function TodayDashboard(props: {
  today: string;
  timezone: string;
  nowMin: number;
  greeting: string;
  hint: string;
  tasks: TaskDTO[];
  habits: HabitDTO[];
  completedHabitIds: string[];
  activeSleep: SleepSessionDTO | null;
  schedule: SleepScheduleDTO | null;
  lastSleepSummary: { durationLabel: string; status: SleepStatus; wakeLabel: string } | null;
  goals: GoalOption[];
  suggestedCategories: string[];
}) {
  const { today, timezone } = props;
  const router = useRouter();
  const { push } = useToast();
  const { nowMin, clock } = useClock(timezone, props.nowMin);

  const [quickTitle, setQuickTitle] = useState("");
  const [quickPending, setQuickPending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskDTO | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [sleepBusy, setSleepBusy] = useState(false);
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set(props.completedHabitIds));
  const [habitBusy, setHabitBusy] = useState<Set<string>>(new Set());

  const items = useMemo(() => sortForTimeline(props.tasks), [props.tasks]);
  const timed = items.filter((t) => t.startTime);
  const anytime = items.filter((t) => !t.startTime);
  const total = items.length;
  const done = items.filter((t) => t.status === "completed").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const current = pickCurrentActivity(timed, nowMin);
  const next = pickNextActivity(timed, nowMin);

  // Where the "now" marker lands inside the timed flow.
  const nowIndex = timed.findIndex((t) => (parseTimeToMin(t.startTime) ?? 0) > nowMin);
  const insertAt = nowIndex === -1 ? timed.length : nowIndex;

  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long", month: "long", day: "numeric" }).format(new Date());

  function celebrate(newAchievements?: { title: string; description: string }[]) {
    for (const a of newAchievements ?? []) {
      push({ title: `Achievement unlocked — ${a.title}`, body: a.description, tone: "celebrate" });
    }
  }

  function withBusy(id: string, fn: () => Promise<void>) {
    if (busyIds.has(id)) return;
    setBusyIds((s) => new Set(s).add(id));
    fn().finally(() => setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; }));
  }

  async function toggleComplete(task: TaskDTO) {
    withBusy(task.id, async () => {
      const nextStatus = task.status === "completed" ? "pending" : "completed";
      const res = await api<{ newAchievements?: { title: string; description: string }[] }>(`/api/tasks/${task.id}`, "PATCH", { status: nextStatus });
      if (!res.ok) {
        push({ title: "Couldn't update", body: res.error ?? undefined, tone: "bad" });
        return;
      }
      if (nextStatus === "completed") celebrate(res.data?.newAchievements);
      router.refresh();
    });
  }

  async function quickAdd(e: FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || quickPending) return;
    setQuickPending(true);
    const res = await api("/api/tasks", "POST", { title, date: today });
    setQuickPending(false);
    if (!res.ok) {
      push({ title: "Couldn't add activity", body: res.error ?? undefined, tone: "bad" });
      return;
    }
    setQuickTitle("");
    push({ title: "Added to your flow", tone: "ok" });
    router.refresh();
  }

  async function endSleep() {
    if (!props.activeSleep || sleepBusy) return;
    setSleepBusy(true);
    const res = await api(`/api/sleep/sessions/${props.activeSleep.id}`, "PATCH", { endNow: true });
    setSleepBusy(false);
    if (!res.ok) {
      push({ title: "Couldn't end the sleep session", body: res.error ?? undefined, tone: "bad" });
      return;
    }
    push({ title: "Sleep recorded", tone: "ok" });
    celebrate(res.data?.newAchievements);
    router.refresh();
  }

  async function toggleHabit(habit: HabitDTO) {
    if (habitBusy.has(habit.id)) return;
    const done = !completedHabits.has(habit.id);
    setHabitBusy((s) => new Set(s).add(habit.id));
    const res = await api(`/api/habits/${habit.id}/complete`, "POST", { date: today, done });
    setHabitBusy((s) => { const n = new Set(s); n.delete(habit.id); return n; });
    if (!res.ok) {
      push({ title: "Couldn't record the habit", body: res.error ?? undefined, tone: "bad" });
      return;
    }
    setCompletedHabits((s) => { const n = new Set(s); done ? n.add(habit.id) : n.delete(habit.id); return n; });
    celebrate(res.data?.newAchievements);
  }

  const todaysHabits = props.habits.filter((h) => h.days.includes(weekdayOf(today)));

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-sub">{dateLabel}</p>
          <h1 className="mt-1 font-display text-[2rem] leading-tight font-semibold text-balance">{props.greeting}</h1>
          <p className="mt-1 text-sm text-faint">{props.hint}</p>
        </div>
        <div className="glass flex items-baseline gap-1 rounded-2xl px-5 py-3" aria-label={`Current time ${clock}`}>
          <span className="font-display text-3xl font-semibold tabular-nums tracking-tight">{clock}</span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-faint">{timezone.split("/")[1]?.replace("_", " ") ?? timezone}</span>
        </div>
      </header>

      {/* Sleep states */}
      {props.activeSleep && (
        <div className="glass animate-in flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--c-line)] text-sub"><BedDouble className="size-5" aria-hidden /></span>
            <div>
              <p className="text-sm font-semibold">Sleep in progress</p>
              <p className="text-[13px] text-sub">
                Since {timeLabel(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(props.activeSleep.startedAt)))}
              </p>
            </div>
          </div>
          <Button variant="subtle" onClick={endSleep} loading={sleepBusy}>Wake up & end</Button>
        </div>
      )}

      {/* Day progress */}
      {total > 0 && (
        <section aria-label="Day progress" className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{done} of {total} complete</p>
            <p className="font-display text-2xl font-semibold text-accent tabular-nums">{pct}%</p>
          </div>
          <ProgressBar value={pct} className="mt-3" label="Share of today's activities completed" />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* TimeFlow timeline */}
        <section aria-label="TimeFlow timeline" className="min-w-0">
          {current && (
            <div className="glass animate-in mb-4 rounded-2xl border-accent/25 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Now</p>
              <p className="mt-1 font-display text-xl font-semibold">{current.title}</p>
              {current.endTime && (
                <p className="mt-0.5 text-[13px] text-sub">until {timeLabel(current.endTime)} · {formatDuration((parseTimeToMin(current.endTime)! - nowMin))} left</p>
              )}
            </div>
          )}
          {!current && next && (
            <div className="card animate-in mb-4 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">Next up</p>
              <p className="mt-1 font-display text-xl font-semibold">{next.title}</p>
              <p className="mt-0.5 text-[13px] text-sub">at {timeLabel(next.startTime)} · in {formatDuration((parseTimeToMin(next.startTime) ?? nowMin) - nowMin)}</p>
            </div>
          )}

          {items.length === 0 ? (
            <EmptyState
              icon={Waves}
              title="Your flow is empty today"
              body="Add your first activity and LifeOS will start drawing your day on the timeline."
              action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" aria-hidden /> Plan your first activity</Button>}
            />
          ) : (
            <ol className="relative" aria-label="Today's activities in chronological order">
              {/* rail */}
              <span aria-hidden className="absolute top-2 bottom-2 left-[68px] w-px bg-[var(--c-line-strong)] max-sm:left-[59px]" />
              {timed.map((task, i) => (
                <TimelineRow
                  key={task.id}
                  task={task}
                  nowMin={nowMin}
                  busy={busyIds.has(task.id)}
                  onToggle={() => toggleComplete(task)}
                  onEdit={() => { setEditing(task); setFormOpen(true); }}
                  nowBefore={i === insertAt}
                />
              ))}
              {insertAt === timed.length && timed.length > 0 && <NowMarker nowMin={nowMin} />}
              {anytime.length > 0 && (
                <>
                  <li className="relative flex items-center gap-4 py-2 pl-[52px] max-sm:pl-[46px]">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint">Anytime today</span>
                  </li>
                  {anytime.map((task) => (
                    <TimelineRow
                      key={task.id}
                      task={task}
                      nowMin={nowMin}
                      busy={busyIds.has(task.id)}
                      onToggle={() => toggleComplete(task)}
                      onEdit={() => { setEditing(task); setFormOpen(true); }}
                    />
                  ))}
                </>
              )}
            </ol>
          )}

          {/* Quick add */}
          <form onSubmit={quickAdd} className="glass mt-5 flex items-center gap-2 rounded-2xl p-2 pl-4">
            <Plus className="size-4 shrink-0 text-faint" aria-hidden />
            <input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Quick add an activity for today…"
              aria-label="Quick add an activity for today"
              maxLength={140}
              className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            <Button type="submit" size="sm" loading={quickPending} disabled={!quickTitle.trim()}>Add</Button>
          </form>
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-3 w-full rounded-2xl border border-dashed border-[var(--c-line-strong)] py-3 text-sm font-medium text-sub transition-colors hover:border-accent/50 hover:text-accent">
            + Detailed activity (time, priority, goal…)
          </button>
        </section>

        {/* Right rail */}
        <aside className="grid content-start gap-4">
          <section aria-label="Today's habits" className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Today&rsquo;s habits</h2>
              <Link href="/plan" className="text-[13px] font-medium text-accent hover:underline">Open Plan</Link>
            </div>
            {todaysHabits.length === 0 ? (
              <p className="mt-3 text-[13px] text-faint">No habits scheduled today. Create one in Plan to build momentum.</p>
            ) : (
              <ul className="mt-3 grid gap-1.5">
                {todaysHabits.map((h) => {
                  const isDone = completedHabits.has(h.id);
                  return (
                    <li key={h.id}>
                      <button
                        onClick={() => toggleHabit(h)}
                        disabled={habitBusy.has(h.id)}
                        aria-pressed={isDone}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                          isDone ? "bg-success/10 text-ink" : "hover:bg-[var(--c-line)] text-sub",
                        )}
                      >
                        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border transition-colors", isDone ? "border-success bg-success text-white" : "border-[var(--c-line-strong)] text-transparent")} aria-hidden>
                          <CheckIcon className="size-3" />
                        </span>
                        <span className={cn("truncate font-medium", isDone && "text-sub line-through decoration-sub/50")}>{h.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Sleep summary" className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sleep</h2>
              <Link href="/sleep" className="text-[13px] font-medium text-accent hover:underline">Open Sleep</Link>
            </div>
            {props.lastSleepSummary ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--c-line)] text-sub"><MoonStar className="size-5" aria-hidden /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tabular-nums">{props.lastSleepSummary.durationLabel}</p>
                  <Badge tone={STATUS_TONE[props.lastSleepSummary.status]} className="mt-1">{STATUS_LABEL[props.lastSleepSummary.status]}</Badge>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-faint">No sleep recorded yet. Tonight, press “Start sleep” in the Sleep module.</p>
            )}
          </section>
        </aside>
      </div>

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editing}
        defaultDate={today}
        goals={props.goals}
        suggestedCategories={props.suggestedCategories}
      />
    </div>
  );
}

function NowMarker({ nowMin }: { nowMin: number }) {
  return (
    <li aria-hidden className="relative flex items-center gap-3 py-1 pl-[52px] max-sm:pl-[46px]">
      <span className="now-pulse -ml-[3px] size-1.5 rounded-full bg-accent" />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Now</span>
      <span className="h-px flex-1 bg-accent/50" />
    </li>
  );
}

function TimelineRow({
  task,
  nowMin,
  busy,
  onToggle,
  onEdit,
  nowBefore,
}: {
  task: TaskDTO;
  nowMin: number;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  nowBefore?: boolean;
}) {
  const isDone = task.status === "completed";
  const overdue = isOverdueWithinDay(task, nowMin);
  const started = task.startTime ? (parseTimeToMin(task.startTime) ?? Infinity) <= nowMin : false;
  const isCurrent = started && !isDone && ((task.endTime && (parseTimeToMin(task.endTime) ?? 0) > nowMin) || false);

  return (
    <>
      {nowBefore && <NowMarker nowMin={nowMin} />}
      <li className={cn("relative flex items-center gap-3 py-1.5 pl-[52px] max-sm:pl-[46px]")}>
        <span aria-hidden className="absolute left-0 w-[52px] text-right text-[12px] font-semibold tabular-nums text-sub max-sm:w-[44px]">
          {task.startTime ? timeLabel(task.startTime).replace(" ", "\u00a0") : "·"}
        </span>
        <span
          aria-hidden
          className={cn(
            "absolute left-[68px] z-10 size-2.5 -translate-x-1/2 rounded-full border-2 max-sm:left-[59px]",
            isDone && "border-success bg-success",
            isCurrent && "now-pulse border-accent bg-accent",
            !isDone && !isCurrent && (overdue ? "border-error bg-error/30" : "border-[var(--c-line-strong)] bg-[var(--c-bg)]"),
          )}
        />
        <div
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-150",
            isCurrent
              ? "glass border-accent/25"
              : "border-transparent hover:border-[var(--c-line)] hover:bg-[var(--c-raised)]",
            isDone && "opacity-60",
          )}
        >
          <button
            onClick={onToggle}
            disabled={busy}
            role="checkbox"
            aria-checked={isDone}
            aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-150 disabled:opacity-40",
              isDone ? "border-success bg-success text-white" : "border-[var(--c-line-strong)] text-transparent hover:border-accent hover:text-accent/40",
            )}
          >
            <CheckIcon className="size-3.5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[15px] font-medium", isDone && "line-through decoration-sub/50")}>{task.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-faint">
              {task.startTime && (
                <span className="tabular-nums">
                  {timeLabel(task.startTime)}{task.endTime ? ` – ${timeLabel(task.endTime)}` : ""}
                </span>
              )}
              <span className="capitalize">{task.category}</span>
              {task.priority === "high" && <Badge tone="accent">High</Badge>}
              {overdue && <Badge tone="bad">Overdue</Badge>}
              {isCurrent && <Badge tone="accent">Now</Badge>}
            </p>
          </div>
          <button
            onClick={onEdit}
            aria-label={`Edit ${task.title}`}
            className="grid size-8 shrink-0 place-items-center rounded-full text-faint opacity-0 transition-all hover:bg-[var(--c-line)] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        </div>
      </li>
    </>
  );
}

