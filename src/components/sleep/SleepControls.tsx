"use client";

import { useEffect, useState, useTransition } from "react";
import { BedDouble, MoonStar, Pencil, Sunrise, Trash2, TriangleAlert } from "lucide-react";
import {
  correctSleepAction,
  deleteSleepAction,
  startSleepAction,
  wakeUpAction,
} from "@/server/actions/sleep";
import { FieldError, Spinner } from "@/components/ui";
import { formatClock, formatDuration } from "@/lib/time";
import { STATUS_COPY, type SleepStatus } from "@/lib/sleep";

export type SerializedSession = {
  id: string;
  startedAt: string; // ISO
  endedAt: string | null;
  durationMinutes: number | null;
  manual: boolean;
};

function toInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function useElapsedSince(iso: string | null): number {
  const [minutes, setMinutes] = useState(() =>
    iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)) : 0,
  );
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => {
      setMinutes(Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)));
    }, 30_000);
    return () => clearInterval(t);
  }, [iso]);
  return minutes;
}

export function SleepActions({
  active,
  timezone,
  targetMinutes,
  bedtimeSuggestion,
}: {
  active: { id: string; startedAt: string } | null;
  timezone: string;
  targetMinutes: number | null;
  bedtimeSuggestion: string | null;
}) {
  const [error, setError] = useState("");
  const [correcting, setCorrecting] = useState<{ id: string; startedAt: string } | null>(null);
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [pending, start] = useTransition();
  const elapsed = useElapsedSince(active?.startedAt ?? null);

  function begin() {
    setError("");
    start(async () => {
      const res = await startSleepAction();
      if (!res.ok) setError(res.error);
    });
  }

  function wake() {
    setError("");
    start(async () => {
      const res = await wakeUpAction();
      if (!res.ok && "needsCorrection" in res && res.needsCorrection && res.sessionId && active) {
        setCorrecting({ id: res.sessionId, startedAt: active.startedAt });
        setStartValue(toInputValue(active.startedAt));
        setEndValue(toInputValue(new Date().toISOString()));
        setError(res.error);
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function saveCorrection() {
    if (!correcting) return;
    start(async () => {
      const res = await correctSleepAction({
        id: correcting.id,
        startedAt: new Date(startValue).toISOString(),
        endedAt: new Date(endValue).toISOString(),
      });
      if (res.ok) {
        setCorrecting(null);
        setError("");
      } else setError(res.error);
    });
  }

  function discardCorrection() {
    if (!correcting) return;
    start(async () => {
      await deleteSleepAction(correcting.id);
      setCorrecting(null);
      setError("");
    });
  }

  if (correcting) {
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-amber">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          Correct the times below to keep this session, or discard it.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="corr-start">Went to bed</label>
            <input id="corr-start" type="datetime-local" className="input" value={startValue} onChange={(e) => setStartValue(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="corr-end">Woke up</label>
            <input id="corr-end" type="datetime-local" className="input" value={endValue} onChange={(e) => setEndValue(e.target.value)} />
          </div>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm btn-primary" onClick={saveCorrection} disabled={pending}>
            {pending ? <Spinner size={13} /> : "Save correction"}
          </button>
          <button className="btn btn-sm btn-ghost text-red" onClick={discardCorrection} disabled={pending}>
            Discard session
          </button>
        </div>
      </div>
    );
  }

  if (active) {
    return (
      <div>
        <div className="flex items-center gap-3 rounded-[14px] bg-accent-soft p-4">
          <MoonStar size={20} className="shrink-0 text-accent-ink" aria-hidden />
          <div className="flex-1">
            <p className="text-[14.5px] font-semibold text-accent-ink">
              Sleep tracking is on
            </p>
            <p className="text-[12.5px] text-accent-ink/80">
              Since {formatClock(active.startedAt, timezone)} · {formatDuration(elapsed)} so far
            </p>
          </div>
        </div>
        <button className="btn btn-primary mt-3 w-full" onClick={wake} disabled={pending}>
          {pending ? <Spinner size={15} /> : <Sunrise size={16} />}
          I woke up
        </button>
        {error && <FieldError>{error}</FieldError>}
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-secondary w-full" onClick={begin} disabled={pending}>
        {pending ? <Spinner size={15} /> : <BedDouble size={16} />}
        Start sleep
      </button>
      {bedtimeSuggestion && (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink3">
          Plan to start around <strong className="font-semibold text-ink2">{bedtimeSuggestion}</strong> to
          meet your {formatDuration(targetMinutes)} target.
        </p>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

export function SleepStatusBadge({
  durationMinutes,
  targetMinutes,
  status,
}: {
  durationMinutes: number;
  targetMinutes: number | null;
  status: SleepStatus | null;
}) {
  if (!status) return null;
  const copy = STATUS_COPY[status];
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[30px] font-bold tracking-tight text-ink">
          {formatDuration(durationMinutes)}
        </span>
        {targetMinutes != null && (
          <span className="text-[13px] text-ink3">of {formatDuration(targetMinutes)} target</span>
        )}
      </div>
      <span
        className={`badge mt-1.5 ${
          copy.tone === "green"
            ? "bg-accent-soft text-accent-ink"
            : copy.tone === "amber"
              ? "bg-amber-soft text-amber"
              : "bg-red-soft text-red"
        }`}
      >
        {copy.label}
      </span>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink3">
        Time in bed — an estimate, not a measure of sleep quality.
      </p>
    </div>
  );
}

export function SleepHistoryList({
  sessions,
  timezone,
  targetMinutes,
}: {
  sessions: SerializedSession[];
  timezone: string;
  targetMinutes: number | null;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function beginEdit(s: SerializedSession) {
    setEditing(s.id);
    setConfirming(null);
    setStartValue(toInputValue(s.startedAt));
    setEndValue(toInputValue(s.endedAt ?? new Date().toISOString()));
    setError("");
  }

  function saveEdit(id: string) {
    start(async () => {
      const res = await correctSleepAction({
        id,
        startedAt: new Date(startValue).toISOString(),
        endedAt: new Date(endValue).toISOString(),
      });
      if (res.ok) setEditing(null);
      else setError(res.error);
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteSleepAction(id);
      if (!res.ok) setError(res.error);
      setConfirming(null);
    });
  }

  if (sessions.length === 0) return null;

  return (
    <ul className="divide-y divide-line">
      {sessions.map((s) => {
        const status: SleepStatus | null =
          s.durationMinutes != null && targetMinutes != null
            ? s.durationMinutes > targetMinutes + 90
              ? "over"
              : s.durationMinutes >= targetMinutes - 45
                ? "met"
                : s.durationMinutes >= targetMinutes - 120
                  ? "short"
                  : "very_short"
            : null;
        const tone =
          status == null
            ? "bg-line-strong"
            : STATUS_COPY[status].tone === "green"
              ? "bg-accent"
              : STATUS_COPY[status].tone === "amber"
                ? "bg-amber"
                : "bg-red";
        return (
          <li key={s.id} className="py-3">
            {editing === s.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Went to bed</label>
                    <input type="datetime-local" className="input" value={startValue} onChange={(e) => setStartValue(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Woke up</label>
                    <input type="datetime-local" className="input" value={endValue} onChange={(e) => setEndValue(e.target.value)} />
                  </div>
                </div>
                {error && <FieldError>{error}</FieldError>}
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-primary" onClick={() => saveEdit(s.id)} disabled={pending}>
                    {pending ? <Spinner size={13} /> : "Save"}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)} disabled={pending}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : confirming === s.id ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] text-ink2">
                  {formatClock(s.startedAt, timezone)} → {formatClock(s.endedAt, timezone)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-red">Delete this session?</span>
                  <button className="btn btn-sm bg-red-soft text-red" onClick={() => remove(s.id)} disabled={pending}>
                    {pending ? <Spinner size={13} /> : "Delete"}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(null)} disabled={pending}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group flex items-center gap-3">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink">
                    {formatClock(s.startedAt, timezone)} → {formatClock(s.endedAt, timezone)}
                    <span className="ml-2 text-ink3">{formatDuration(s.durationMinutes)}</span>
                  </p>
                  <p className="text-[12px] text-ink3">
                    {new Date(s.startedAt).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: timezone,
                    })}
                    {s.manual ? " · corrected" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                  <button className="icon-btn" onClick={() => beginEdit(s)} aria-label="Edit session">
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn hover:!text-red" onClick={() => setConfirming(s.id)} aria-label="Delete session">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
