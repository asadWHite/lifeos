"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Footprints } from "lucide-react";
import { saveCheckinAction } from "@/server/actions/sleep";
import { FieldError, Spinner } from "@/components/ui";

const QUICK = [10, 20, 30, 45, 60];

/** Optional daily activity entry — minutes only, no fake precision. */
export function ActivityLogger({
  initialMinutes,
  initialNote,
}: {
  initialMinutes: number | null;
  initialNote: string | null;
}) {
  const [minutes, setMinutes] = useState<number | null>(initialMinutes);
  const [note, setNote] = useState(initialNote ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function flash() {
    setSavedFlash(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSavedFlash(false), 1800);
  }

  function pick(m: number) {
    const next = minutes === m ? null : m; // tap again to clear
    setMinutes(next);
    start(async () => {
      const res = await saveCheckinAction({ activityMinutes: next });
      if (!res.ok) setError(res.error ?? "Couldn't save.");
      else { setError(""); flash(); }
    });
  }

  function saveNote() {
    start(async () => {
      const res = await saveCheckinAction({ note: note.trim() || null });
      if (!res.ok) setError(res.error ?? "Couldn't save.");
      else { setError(""); flash(); }
    });
  }

  return (
    <div>
      <span className="label">
        Physical activity today <span className="font-normal text-ink3">(optional, rough minutes)</span>
      </span>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Activity minutes">
        <Footprints size={16} className="text-ink3" aria-hidden />
        {QUICK.map((m) => (
          <button
            key={m}
            type="button"
            className="chip"
            data-selected={minutes === m}
            aria-pressed={minutes === m}
            onClick={() => pick(m)}
          >
            {m} min
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="input"
          placeholder="What did you do? (walk, swim… optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          maxLength={240}
          aria-label="Activity note"
        />
      </div>
      <div className="mt-2 flex h-4 items-center gap-1.5 text-[12px]">
        {pending && <Spinner size={12} className="text-ink3" />}
        {savedFlash && !pending && (
          <span className="inline-flex items-center gap-1 font-medium text-accent-ink animate-fade">
            <Check size={12} /> Saved
          </span>
        )}
        <FieldError>{error}</FieldError>
      </div>
    </div>
  );
}
