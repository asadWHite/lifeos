"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, RefreshCcw, Trash2 } from "lucide-react";
import {
  deleteProfileDataAction,
  signOutProfileAction,
  retakeOnboardingAction,
  updateSettingsAction,
} from "@/server/actions/account";
import { FieldError, Spinner, Toggle } from "@/components/ui";
import { PHONE_USE, PLANNING_STYLES } from "@/lib/onboarding";

function useSaveFlash() {
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return {
    flash,
    bump: () => {
      setFlash(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(false), 1800);
    },
  };
}

export function Saved({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink animate-fade">
      <Check size={13} /> Saved
    </span>
  );
}

export function ProfileForm({ name, timezone }: { name: string; timezone: string }) {
  const [n, setN] = useState(name);
  const [zones] = useState<string[]>(() => {
    try {
      const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
      return supported ? supported("timeZone") : [timezone];
    } catch {
      return [timezone];
    }
  });
  const [tz, setTz] = useState(timezone);
  const [error, setError] = useState("");
  const { flash, bump } = useSaveFlash();
  const [pending, start] = useTransition();

  function save() {
    if (!n.trim()) {
      setError("Your name can't be empty.");
      return;
    }
    start(async () => {
      const res = await updateSettingsAction({ name: n.trim(), timezone: tz });
      if (res.ok) { setError(""); bump(); } else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="set-name">Name</label>
          <input id="set-name" className="input" value={n} onChange={(e) => setN(e.target.value)} maxLength={40} />
        </div>
        <div>
          <label className="label" htmlFor="set-tz">Timezone</label>
          <select id="set-tz" className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[11.5px] text-ink3">Used for “today”, greetings, and sleep nights.</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-sm" onClick={save} disabled={pending}>
          {pending ? <Spinner size={13} /> : "Save profile"}
        </button>
        <Saved show={flash} />
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function SleepForm({
  targetMinutes,
  wakeTime,
  bedtime,
  phoneBeforeBed,
}: {
  targetMinutes: number;
  wakeTime: string | null;
  bedtime: string | null;
  phoneBeforeBed: string | null;
}) {
  const [target, setTarget] = useState(String(targetMinutes));
  const [wake, setWake] = useState(wakeTime ?? "");
  const [bed, setBed] = useState(bedtime ?? "");
  const [phone, setPhone] = useState(phoneBeforeBed ?? "");
  const [error, setError] = useState("");
  const { flash, bump } = useSaveFlash();
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateSettingsAction({
        sleepTargetMinutes: Number(target) || null,
        wakeTime: wake || null,
        bedtime: bed || null,
        phoneBeforeBed: (phone || null) as "rarely" | "sometimes" | "often" | "prefer_not" | null,
      });
      if (res.ok) { setError(""); bump(); } else setError(res.error);
    });
  }

  const options: Array<{ value: string; label: string }> = [];
  for (let m = 360; m <= 660; m += 15) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    options.push({ value: String(m), label: mm === 0 ? `${h}h` : `${h}h ${mm}m` });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="set-target">Sleep target</label>
          <select id="set-target" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="set-wake">Desired wake-up</label>
          <input id="set-wake" type="time" className="input" value={wake} onChange={(e) => setWake(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="set-bed">Desired bedtime</label>
          <input id="set-bed" type="time" className="input" value={bed} onChange={(e) => setBed(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="set-phone">Phone use before sleep</label>
        <select id="set-phone" className="input max-w-60" value={phone} onChange={(e) => setPhone(e.target.value)}>
          <option value="">Not set</option>
          {PHONE_USE.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink3">
          If you chose “often”, aim to begin your wind-down about 30 minutes before your desired
          bedtime. LIFEOS can&rsquo;t measure real screen time in this version.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-sm" onClick={save} disabled={pending}>
          {pending ? <Spinner size={13} /> : "Save sleep settings"}
        </button>
        <Saved show={flash} />
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

const HIDABLE = [
  { id: "sleep", label: "Sleep card" },
  { id: "goals", label: "Goals card" },
  { id: "brain", label: "Assistant card" },
  { id: "upcoming", label: "Coming up" },
  { id: "checkin", label: "Energy check-in" },
];

export function PlanningForm({
  planningStyle,
  hidden,
}: {
  planningStyle: string | null;
  hidden: string[];
}) {
  const [style, setStyle] = useState(planningStyle ?? "together");
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set(hidden));
  const { flash, bump } = useSaveFlash();
  const [, start] = useTransition();

  function pickStyle(id: string) {
    setStyle(id);
    start(async () => {
      const res = await updateSettingsAction({ planningStyle: id as "full_plan" | "together" | "independent" });
      if (res.ok) bump();
    });
  }

  function toggleSection(id: string, show: boolean) {
    const next = new Set(hiddenSet);
    if (show) next.delete(id);
    else next.add(id);
    setHiddenSet(next);
    start(async () => {
      const res = await updateSettingsAction({ hiddenSections: [...next] });
      if (res.ok) bump();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="label">How much planning help do you want?</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Planning style">
          {PLANNING_STYLES.map((o) => (
            <button
              key={o.id}
              type="button"
              className="chip"
              data-selected={style === o.id}
              onClick={() => pickStyle(o.id)}
              title={o.description}
            >
              {o.label.replace("Let LIFEOS suggest a ", "Full ")}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Home sections</span>
        <div className="space-y-3">
          {HIDABLE.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3">
              <span className="text-[14px] text-ink">{s.label}</span>
              <Toggle
                label={`Show ${s.label}`}
                checked={!hiddenSet.has(s.id)}
                onChange={(show) => toggleSection(s.id, show)}
              />
            </div>
          ))}
        </div>
      </div>
      <Saved show={flash} />
    </div>
  );
}

export function AppearanceForm({ theme }: { theme: string }) {
  const [value, setValue] = useState(theme);
  const [, start] = useTransition();

  function apply(next: string) {
    setValue(next);
    try {
      localStorage.setItem("lifeos-theme", next);
      const dark = next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (dark) document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
    } catch {
      /* private mode */
    }
    start(async () => {
      await updateSettingsAction({ theme: next as "light" | "dark" | "system" });
    });
  }

  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Theme">
      {(["light", "dark", "system"] as const).map((t) => (
        <button key={t} type="button" className="chip capitalize" data-selected={value === t} onClick={() => apply(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function RetakeButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-secondary btn-sm"
      onClick={() =>
        start(async () => {
          await retakeOnboardingAction();
          router.push("/onboarding");
        })
      }
      disabled={pending}
    >
      {pending ? <Spinner size={13} /> : <RefreshCcw size={13} />}
      Retake personalization quiz
    </button>
  );
}

export function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function destroy() {
    start(async () => {
      const res = await deleteProfileDataAction();
      if (!res.ok) {
        setError(res.error);
        setConfirming(false);
      }
      // On success the session is gone; guard rails redirect on next render.
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <form action={signOutProfileAction}>
          <button className="btn btn-secondary btn-sm" type="submit">
            <LogOut size={14} />
            Sign out of this profile
          </button>
        </form>
      </div>
      <div className="rounded-[14px] border border-red-line bg-red-soft/50 p-4">
        <p className="text-[13.5px] font-semibold text-ink">Delete this profile</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">
          Permanently removes your profile and everything attached to it: tasks, goals,
          sleep sessions, check-ins, preferences and assistant history on this deployment.
        </p>
        {confirming ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 animate-fade">
            <span className="text-[12.5px] font-semibold text-red">This can&rsquo;t be undone.</span>
            <button className="btn btn-sm bg-red text-white" onClick={destroy} disabled={pending}>
              {pending ? <Spinner size={13} /> : <Trash2 size={13} />}
              Delete everything
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-sm btn-danger mt-3 border !border-red-line bg-surface" onClick={() => setConfirming(true)}>
            <Trash2 size={13} />
            Delete profile…
          </button>
        )}
        {error && <FieldError>{error}</FieldError>}
      </div>
    </div>
  );
}
