"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlarmClockCheck, BedDouble, CalendarPlus, MoonStar, Pencil, Smartphone, Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import type { SleepScheduleDTO } from "@/lib/dto-types";
import { formatDuration, timeLabel } from "@/lib/dates";
import { STATUS_LABEL, targetSleepMin, type SleepStatus } from "@/lib/sleep";
import { BarsChart, type BarDatum } from "@/components/charts";
import type { SleepRow } from "@/app/(app)/sleep/page";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, ProgressBar, Textarea, cn, useToast } from "@/components/ui";

const STATUS_DOT: Record<SleepStatus, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-error",
  none: "bg-[var(--c-line-strong)]",
};
const STATUS_TONE: Record<SleepStatus, "ok" | "warn" | "bad" | "neutral"> = {
  green: "ok", yellow: "warn", red: "bad", none: "neutral",
};

function toLocalInput(iso: string | null, tz: string): string {
  if (!iso) return "";
  // Build "YYYY-MM-DDTHH:MM" as wall time in the user's timezone.
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
function fromLocalInput(v: string, tzOffsetNote?: string): string {
  // Interpret the wall time as local browser time; good enough for manual
  // corrections (the displayed value was produced in the user's timezone).
  return new Date(v).toISOString();
}

export function SleepModule(props: {
  today: string;
  timezone: string;
  schedule: SleepScheduleDTO | null;
  defaults: { bedtime: string; wakeTime: string; toleranceMin: number };
  rows: SleepRow[];
  active: SleepRow | null;
  stats: { avg7: number | null; greenCount: number; totalSessions: number };
  chart: BarDatum[];
  phoneNotes: string[];
}) {
  const router = useRouter();
  const { push } = useToast();

  // Schedule form
  const [bedtime, setBedtime] = useState(props.defaults.bedtime);
  const [wakeTime, setWakeTime] = useState(props.defaults.wakeTime);
  const [tolerance, setTolerance] = useState(String(props.defaults.toleranceMin));
  const [schedPending, setSchedPending] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);

  // Live session
  const [elapsed, setElapsed] = useState("");
  const [sessionPending, setSessionPending] = useState(false);

  // Edit / log modals
  const [editRow, setEditRow] = useState<SleepRow | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const target = targetSleepMin(bedtime, wakeTime);

  useEffect(() => {
    if (!props.active) return;
    const start = new Date(props.active.startedAt).getTime();
    const update = () => setElapsed(formatDuration((Date.now() - start) / 60000));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [props.active]);

  const scheduleDirty =
    bedtime !== props.defaults.bedtime || wakeTime !== props.defaults.wakeTime || tolerance !== String(props.defaults.toleranceMin);

  async function saveSchedule(e: FormEvent) {
    e.preventDefault();
    if (schedPending) return;
    setSchedPending(true);
    setSchedError(null);
    const res = await api("/api/sleep/schedule", "PUT", { bedtime, wakeTime, toleranceMin: Number(tolerance) || 0 });
    setSchedPending(false);
    if (!res.ok) {
      setSchedError(res.error ?? "Could not save the schedule.");
      return;
    }
    push({ title: "Sleep schedule saved", tone: "ok" });
    router.refresh();
  }

  async function toggleSession() {
    if (sessionPending) return;
    setSessionPending(true);
    if (props.active) {
      const res = await api(`/api/sleep/sessions/${props.active.id}`, "PATCH", { endNow: true });
      setSessionPending(false);
      if (!res.ok) return push({ title: "Couldn't end the session", body: res.error ?? undefined, tone: "bad" });
      push({ title: "Sleep recorded", tone: "ok" });
      for (const a of res.data?.newAchievements ?? []) push({ title: `Achievement unlocked — ${a.title}`, body: a.description, tone: "celebrate" });
    } else {
      const res = await api("/api/sleep/sessions", "POST", {});
      setSessionPending(false);
      if (!res.ok) return push({ title: "Couldn't start the session", body: res.error ?? undefined, tone: "bad" });
      push({ title: "Sleep started", body: "Sweet dreams. Session survives reloads.", tone: "ok" });
    }
    router.refresh();
  }

  function openEdit(row: SleepRow | null) {
    setEditRow(row);
    setLogOpen(!row);
    setEditStart(row ? toLocalInput(row.startedAt, props.timezone) : "");
    setEditEnd(row ? toLocalInput(row.endedAt, props.timezone) : "");
    setEditNote(row?.note ?? "");
    setEditError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (editPending) return;
    if (!editStart) return setEditError("Choose when the sleep started.");
    if (editEnd && editEnd <= editStart) return setEditError("Wake time must be after bedtime.");
    setEditPending(true);
    setEditError(null);
    const payload = { startedAt: fromLocalInput(editStart), endedAt: editEnd ? fromLocalInput(editEnd) : null, note: editNote.trim() };
    const res = editRow
      ? await api(`/api/sleep/sessions/${editRow.id}`, "PATCH", payload)
      : await api("/api/sleep/sessions", "POST", payload);
    setEditPending(false);
    if (!res.ok) return setEditError(res.error ?? "Could not save the record.");
    push({ title: editRow ? "Sleep record updated" : "Past sleep logged", tone: "ok" });
    setEditRow(null);
    setLogOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!deleteId || deleting) return;
    setDeleting(true);
    const res = await api(`/api/sleep/sessions/${deleteId}`, "DELETE");
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) return push({ title: "Couldn't delete the record", body: res.error ?? undefined, tone: "bad" });
    push({ title: "Sleep record deleted", tone: "info" });
    router.refresh();
  }

  const savedLabel = props.schedule ? "Saved" : "Prefilled from your onboarding — save to confirm";

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-[2rem] font-semibold">Sleep</h1>
        <p className="mt-1 text-sm text-sub">
          Manually recorded sessions compared against your target schedule. LifeOS never claims to measure sleep stages or quality — consistency is the signal.
        </p>
      </header>

      {/* Stats row */}
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="7-day average" value={props.stats.avg7 != null ? formatDuration(props.stats.avg7) : "—"} />
        <StatCard label="On-schedule wakes" value={String(props.stats.greenCount)} />
        <StatCard label="Nights recorded" value={String(props.stats.totalSessions)} />
        <StatCard label="Target tonight" value={target != null ? formatDuration(target) : "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live session */}
        <section aria-label="Sleep session" className="glass flex flex-col items-center justify-center rounded-3xl p-8 text-center">
          {props.active ? (
            <>
              <span className="now-pulse grid size-14 place-items-center rounded-full bg-[var(--c-line)] text-sub"><BedDouble className="size-7" aria-hidden /></span>
              <p className="mt-4 font-display text-4xl font-semibold tabular-nums">{elapsed}</p>
              <p className="mt-1 text-sm text-sub">asleep since {props.active.startLabel}</p>
              <Button className="mt-6" size="lg" onClick={toggleSession} loading={sessionPending}>Wake up</Button>
            </>
          ) : (
            <>
              <span className="grid size-14 place-items-center rounded-full bg-accent/15 text-accent"><MoonStar className="size-7" aria-hidden /></span>
              <p className="mt-4 font-display text-2xl font-semibold">Ready for tonight?</p>
              <p className="mt-1 max-w-xs text-sm text-sub">Start a session when you get into bed — it keeps running even if you close the app.</p>
              <Button className="mt-6" size="lg" onClick={toggleSession} loading={sessionPending}>Start sleep</Button>
              <button onClick={() => openEdit(null)} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-sub hover:text-ink">
                <CalendarPlus className="size-4" aria-hidden /> Log a past night instead
              </button>
            </>
          )}
        </section>

        {/* Schedule */}
        <section aria-label="Sleep schedule" className="card p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><AlarmClockCheck className="size-4 text-accent" aria-hidden /> Target schedule</h2>
            <span className="text-[11px] font-medium text-faint">{savedLabel}</span>
          </div>
          <form onSubmit={saveSchedule} className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bedtime" htmlFor="sl-bed"><Input id="sl-bed" type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} /></Field>
              <Field label="Wake up" htmlFor="sl-wake"><Input id="sl-wake" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} /></Field>
            </div>
            <Field
              label={`On-time tolerance: ${tolerance} min`}
              htmlFor="sl-tol"
              hint={`Waking within ±${tolerance} min of ${wakeTime || "target"} counts green; up to 60 min late is yellow; beyond—or under 2h of sleep—is red.`}
            >
              <input id="sl-tol" type="range" min={0} max={60} step={5} value={tolerance} onChange={(e) => setTolerance(e.target.value)} className="w-full accent-[var(--color-accent)]" />
            </Field>
            {schedError && <p role="alert" className="text-[13px] text-bad">{schedError}</p>}
            <Button type="submit" loading={schedPending} disabled={!scheduleDirty} className="justify-self-start">Save schedule</Button>
          </form>
          {props.phoneNotes.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[var(--c-line)] p-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-sub"><Smartphone className="size-4" aria-hidden /> Your self-reported phone habits</p>
              <ul className="mt-1.5 list-disc pl-5 text-[13px] text-faint">
                {props.phoneNotes.map((n) => <li key={n}>{n}</li>)}
              </ul>
              <p className="mt-2 text-[11px] text-faint">From your onboarding answers — LifeOS does not track phone usage.</p>
            </div>
          )}
        </section>
      </div>

      {/* Weekly chart */}
      <section aria-label="Sleep over the last 7 days" className="card p-6">
        <h2 className="text-sm font-semibold">Last 7 days</h2>
        <div className="mt-4">
          <BarsChart data={props.chart} unit="m" ariaLabel="Sleep duration per night over the last 7 days" emptyLabel="No sleep recorded this week — start tonight." />
        </div>
      </section>

      {/* History */}
      <section aria-label="Sleep history">
        <h2 className="mb-3 text-sm font-semibold">History</h2>
        {props.rows.length === 0 ? (
          <EmptyState icon={MoonStar} title="No sleep history" body="Recorded sessions will appear here with duration and schedule comparison." />
        ) : (
          <ul className="stagger grid gap-2">
            {props.rows.map((r) => (
              <li key={r.id} className="card flex items-center gap-3 px-4 py-3">
                <span className={cn("size-2.5 shrink-0 rounded-full", r.endedAt ? STATUS_DOT[r.status] : "now-pulse bg-accent")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.endedAt ? `${r.startLabel} → ${r.endLabel}` : `In progress since ${r.startLabel}`}
                  </p>
                  <p className="mt-0.5 text-[12px] text-faint">
                    {r.durationMin != null ? formatDuration(r.durationMin) : "—"}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                {r.endedAt && r.status !== "none" && <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>}
                <button onClick={() => openEdit(r)} aria-label="Edit sleep record" className="grid size-8 place-items-center rounded-full text-faint hover:bg-[var(--c-line)] hover:text-ink">
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button onClick={() => setDeleteId(r.id)} aria-label="Delete sleep record" className="grid size-8 place-items-center rounded-full text-faint hover:bg-error/15 hover:text-bad">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Edit / log modal */}
      <Modal open={!!editRow || logOpen} onClose={() => { setEditRow(null); setLogOpen(false); setEditStart(""); setEditError(null); }} title={editRow ? "Edit sleep record" : "Log a past night"}>
        <form onSubmit={saveEdit} className="grid gap-4">
          <Field label="Went to bed" htmlFor="se-start"><Input id="se-start" type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} required /></Field>
          <Field label="Woke up" htmlFor="se-end" optional={!editRow}><Input id="se-end" type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} /></Field>
          <Field label="Note" htmlFor="se-note" optional><Textarea id="se-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} maxLength={500} placeholder="e.g. Stayed up finishing a book" /></Field>
          {editError && <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-bad">{editError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { setEditRow(null); setLogOpen(false); }} disabled={editPending}>Cancel</Button>
            <Button type="submit" loading={editPending}>{editRow ? "Save changes" : "Log sleep"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this sleep record?"
        body="The session and its duration will be removed from your history and statistics."
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className="mt-1.5 font-display text-[1.45rem] leading-none font-semibold tabular-nums">{value}</p>
    </div>
  );
}
