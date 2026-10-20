"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Flag, Flame, Lock, Plus } from "lucide-react";
import { api } from "@/lib/client-api";
import type { DaySummary } from "@/lib/stats";
import { formatDateHuman, formatDuration } from "@/lib/dates";
import { AchievementIcon, Badge, Button, EmptyState, Modal, ProgressBar, Select, cn, useToast } from "@/components/ui";
import { BarsChart, type BarDatum } from "@/components/charts";

export interface AchievementView {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number };
}

export interface ChallengeView {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  countedDays: number;
  totalDays: number;
  pct: number;
  missedDays: number;
  days: { date: string; state: "counted" | "missed" | "today" | "future" }[];
}

const STATE_TONE: Record<string, "ok" | "bad" | "accent" | "neutral"> = {
  completed: "ok",
  failed: "bad",
  active: "accent",
};

export function ProgressModule(props: {
  today: string;
  currentYear: number;
  currentMonth: number;
  todaySummary: { total: number; done: number; pct: number };
  week: DaySummary[];
  taskStreak: number;
  taskBest: number;
  habitStats: { id: string; name: string; scheduled: number; completed: number; pct: number }[];
  sleep: { avg: number | null; statuses: Record<string, number>; hasSchedule: boolean };
  achievements: AchievementView[];
  challenges: ChallengeView[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [cType, setCType] = useState<"ten_day" | "monthly">("ten_day");
  const [cMonth, setCMonth] = useState(String(props.currentMonth));
  const [cYear, setCYear] = useState(String(props.currentYear));
  const [cPending, setCPending] = useState(false);
  const [cError, setCError] = useState<string | null>(null);

  const weekData: BarDatum[] = props.week.map((d) => ({
    label: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(new Date(`${d.date}T12:00:00Z`)),
    sublabel: `${d.done}/${d.total}`,
    value: d.done,
    secondary: d.total,
    tone: d.date === props.today ? "accent" : "muted" as const,
  }));

  const unlockedCount = props.achievements.filter((a) => a.unlocked).length;

  async function startChallenge() {
    if (cPending) return;
    setCPending(true);
    setCError(null);
    const payload = cType === "ten_day" ? { type: "ten_day" } : { type: "monthly", month: Number(cMonth), year: Number(cYear) };
    const res = await api("/api/challenges", "POST", payload);
    setCPending(false);
    if (!res.ok) return setCError(res.error ?? "Could not start the challenge.");
    push({ title: "Challenge started", body: "Every day you complete at least one task counts.", tone: "ok" });
    setChallengeOpen(false);
    router.refresh();
  }

  const getMonthName = (mm: number) => new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(Date.UTC(2024, mm - 1, 1)));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-[2rem] font-semibold">Progress</h1>
        <p className="mt-1 text-sm text-sub">Everything below is computed from your actual records — no filler numbers.</p>
      </header>

      {/* Headline stats */}
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Today" value={`${props.todaySummary.done}/${props.todaySummary.total}`} hint={props.todaySummary.total ? `${props.todaySummary.pct}% of today's plan` : "no plan today"} />
        <Stat label="Current streak" value={`${props.taskStreak}d`} hint="days with ≥1 completed task" accent />
        <Stat label="Best streak" value={`${props.taskBest}d`} hint="all time" />
        <Stat label="Sleep avg (7d)" value={props.sleep.avg != null ? formatDuration(props.sleep.avg) : "—"} hint={props.sleep.avg != null ? "recorded sessions" : "nothing recorded"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly tasks */}
        <section className="card p-6" aria-label="Task completion over the last 7 days">
          <h2 className="text-sm font-semibold">Tasks · last 7 days</h2>
          <p className="mt-0.5 text-[12px] text-faint">Completed (solid) out of scheduled (track).</p>
          <div className="mt-4">
            <BarsChart data={weekData} ariaLabel="Completed versus scheduled tasks per day for the last 7 days" emptyLabel="No tasks scheduled in the last 7 days." />
          </div>
        </section>

        {/* Habits consistency */}
        <section className="card p-6" aria-label="Habit consistency over the last 28 days">
          <h2 className="text-sm font-semibold">Habit consistency · 28 days</h2>
          <p className="mt-0.5 text-[12px] text-faint">Completions divided by scheduled occurrences (rest days excluded).</p>
          {props.habitStats.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-[var(--c-line-strong)] px-4 py-8 text-center text-[13px] text-faint">No active habits yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {props.habitStats.map((h) => (
                <li key={h.id}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="truncate font-medium">{h.name}</span>
                    <span className="text-faint tabular-nums">{h.completed}/{h.scheduled} · {h.pct}%</span>
                  </div>
                  <ProgressBar value={h.pct} tone="ok" className="mt-1.5" label={`Consistency of ${h.name}`} />
                </li>
              ))}
            </ul>
          )}
          {(props.sleep.statuses.green || props.sleep.statuses.yellow || props.sleep.statuses.red) && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--c-line)] pt-4">
              <span className="text-[12px] font-semibold text-faint">Sleep record:</span>
              {!!props.sleep.statuses.green && <Badge tone="ok">{props.sleep.statuses.green} on schedule</Badge>}
              {!!props.sleep.statuses.yellow && <Badge tone="warn">{props.sleep.statuses.yellow} slightly late</Badge>}
              {!!props.sleep.statuses.red && <Badge tone="bad">{props.sleep.statuses.red} off track</Badge>}
            </div>
          )}
        </section>
      </div>

      {/* Challenges */}
      <section aria-label="Challenges">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Flag className="size-5 text-accent" aria-hidden /> Challenges</h2>
            <p className="mt-0.5 text-[13px] text-faint">Complete at least one task every day of the window. A missed day ends the run.</p>
          </div>
          <Button variant="glass" size="sm" onClick={() => setChallengeOpen(true)}><Plus className="size-4" aria-hidden /> New challenge</Button>
        </div>
        {props.challenges.length === 0 ? (
          <EmptyState icon={Flag} title="No challenges started" body="Try the 10-day challenge: one completed task, every day, ten days running." action={<Button onClick={() => setChallengeOpen(true)}><Flame className="size-4" aria-hidden /> Start the 10-day challenge</Button>} />
        ) : (
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {props.challenges.map((c) => (
              <li key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.type === "ten_day" ? "10-Day Challenge" : `${getMonthName(Number(c.startDate.slice(5, 7)))} ${c.startDate.slice(0, 4)}`}</p>
                    <p className="mt-0.5 text-[12px] text-faint">{formatDateHuman(c.startDate)} → {formatDateHuman(c.endDate)}</p>
                  </div>
                  <Badge tone={STATE_TONE[c.status] ?? "neutral"}>{c.status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-[13px]">
                  <span className="tabular-nums font-medium">{c.countedDays}/{c.totalDays} days</span>
                  {c.missedDays > 0 && <span className="text-bad">{c.missedDays} missed</span>}
                </div>
                <ProgressBar value={c.pct} tone={c.status === "failed" ? "warn" : c.status === "completed" ? "ok" : "accent"} className="mt-1.5" label="Challenge progress" />
                <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
                  {c.days.map((d) => (
                    <span
                      key={d.date}
                      title={d.date}
                      className={cn(
                        "size-2 rounded-full",
                        d.state === "counted" && "bg-success",
                        d.state === "missed" && "bg-error/50",
                        d.state === "today" && "now-pulse bg-accent",
                        d.state === "future" && "bg-[var(--c-line)]",
                      )}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Achievements */}
      <section aria-label="Achievements">
        <h2 className="font-display text-xl font-semibold">Achievements</h2>
        <p className="mt-0.5 text-[13px] text-faint">{unlockedCount} of {props.achievements.length} unlocked — each one verified against your records.</p>
        <ul className="stagger mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {props.achievements.map((a) => (
            <li key={a.key} className={cn("relative overflow-hidden rounded-3xl border p-5 transition-all", a.unlocked ? "glass border-accent/20" : "border-[var(--c-line)] bg-[var(--c-raised)] opacity-75")}>
              <div className="flex items-start justify-between gap-3">
                <span className={cn("grid size-11 place-items-center rounded-2xl", a.unlocked ? "bg-accent/15 text-accent" : "bg-[var(--c-line)] text-faint")}>
                  {a.unlocked ? <AchievementIcon name={a.icon} className="size-5" /> : <Lock className="size-4" aria-hidden />}
                </span>
                {a.unlocked && a.unlockedAt && <span className="text-[11px] text-faint">{formatDateHuman(a.unlockedAt.slice(0, 10))}</span>}
              </div>
              <p className="mt-3 font-semibold">{a.title}</p>
              <p className="mt-0.5 text-[13px] text-sub">{a.description}</p>
              {!a.unlocked && (
                <div className="mt-3">
                  <ProgressBar value={(a.progress.current / Math.max(1, a.progress.target)) * 100} label={`Progress toward ${a.title}`} />
                  <p className="mt-1.5 text-[11px] text-faint tabular-nums">{a.progress.current} / {a.progress.target}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Challenge creation modal */}
      <Modal open={challengeOpen} onClose={() => setChallengeOpen(false)} title="Start a challenge">
        <div className="grid gap-4">
          <div role="tablist" aria-label="Challenge type" className="grid grid-cols-2 gap-2">
            {(["ten_day", "monthly"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={cType === t}
                onClick={() => setCType(t)}
                className={cn("rounded-2xl border p-4 text-left transition-colors", cType === t ? "border-accent/60 bg-accent/10" : "border-[var(--c-line)] hover:border-[var(--c-line-strong)]")}
              >
                <p className="text-sm font-semibold">{t === "ten_day" ? "10-Day Challenge" : "Monthly Challenge"}</p>
                <p className="mt-0.5 text-[12px] text-faint">{t === "ten_day" ? "Starts today, runs 10 days" : "Pick any month and year"}</p>
              </button>
            ))}
          </div>
          {cType === "monthly" && (
            <div className="grid grid-cols-2 gap-3">
              <Select aria-label="Month" value={cMonth} onChange={(e) => setCMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>)}
              </Select>
              <Select aria-label="Year" value={cYear} onChange={(e) => setCYear(e.target.value)}>
                {Array.from({ length: 6 }, (_, i) => props.currentYear - 3 + i).map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
          )}
          <p className="rounded-2xl border border-[var(--c-line)] p-3.5 text-[13px] text-sub">
            <CalendarRange className="mr-1.5 inline size-4 align-[-2px] text-accent" aria-hidden />
            Rule: finish at least one task on every day of the challenge window. Past months are scored from your recorded history; future months can't start yet. February and leap years are handled by the calendar itself.
          </p>
          {cError && <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-bad">{cError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setChallengeOpen(false)} disabled={cPending}>Cancel</Button>
            <Button onClick={startChallenge} loading={cPending}>Start challenge</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("card p-4", accent && "border-accent/25")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className={cn("mt-1.5 font-display text-[1.6rem] leading-none font-semibold tabular-nums", accent && "text-accent")}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-faint">{hint}</p>}
    </div>
  );
}
