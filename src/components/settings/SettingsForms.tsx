"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, RefreshCcw, Trash2, Sun, Moon, Laptop } from "lucide-react";
import { Storage } from "@/lib/client/storage";
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
    <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-emerald-500 animate-fade">
      <Check size={13} strokeWidth={3} /> Saqlandi
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
    if (!n.trim()) { setError("Ismingiz bo'sh bo'lishi mumkin emas."); return; }
    start(() => {
      const pid = Storage.getCurrentProfileId();
      if (!pid) return;
      const p = Storage.getProfile(pid);
      if (p) Storage.saveProfile({ ...p, name: n.trim(), timezone: tz });
      setError(""); bump();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Ism</label>
          <input className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-silver" value={n} onChange={(e) => setN(e.target.value)} maxLength={40} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Vaqt mintaqasi</label>
          <select className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:outline-none" value={tz} onChange={(e) => setTz(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button className="px-4 py-2 bg-brand-dark text-white rounded-xl text-xs font-bold shadow-sm" onClick={save} disabled={pending}>
          {pending ? <Spinner size={13} /> : "Yangilash"}
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
    start(() => {
      const pid = Storage.getCurrentProfileId();
      if (!pid) return;
      const p = Storage.getPrefs(pid);
      if (p) {
        Storage.savePrefs({
          ...p,
          sleepTargetMinutes: Number(target) || null,
          wakeTime: wake || null,
          bedtime: bed || null,
          phoneBeforeBed: (phone || null) as any,
        });
      }
      setError(""); bump();
    });
  }

  const options: Array<{ value: string; label: string }> = [];
  for (let m = 360; m <= 660; m += 15) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    options.push({ value: String(m), label: mm === 0 ? `${h}h` : `${h}h ${mm}m` });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Uyg'onish</label>
          <input type="time" className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:outline-none" value={wake} onChange={(e) => setWake(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Uxshash</label>
          <input type="time" className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:outline-none" value={bed} onChange={(e) => setBed(e.target.value)} />
        </div>
      </div>
      
      <div className="space-y-1">
        <label className="text-[10px] font-black text-ink-muted uppercase tracking-widest px-1">Maqsad (soat)</label>
        <select className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:outline-none" value={target} onChange={(e) => setTarget(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button className="px-4 py-2 bg-brand-dark text-white rounded-xl text-xs font-bold" onClick={save} disabled={pending}>
          {pending ? <Spinner size={13} /> : "Saqlash"}
        </button>
        <Saved show={flash} />
      </div>
    </div>
  );
}

export function AppearanceForm({ theme }: { theme: string }) {
  const [value, setValue] = useState(theme);
  const [, start] = useTransition();

  function apply(next: string) {
    setValue(next);
    start(() => {
      const pid = Storage.getCurrentProfileId();
      if (pid) {
        const p = Storage.getPrefs(pid);
        Storage.savePrefs({ ...p, theme: next });
      }
      try {
        if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
        else if (next === "light") document.documentElement.removeAttribute("data-theme");
        else {
          const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (dark) document.documentElement.setAttribute("data-theme", "dark");
          else document.documentElement.removeAttribute("data-theme");
        }
      } catch {}
    });
  }

  return (
    <div className="flex gap-2">
      {[
        { id: 'light', label: 'Yorug\'', icon: Sun },
        { id: 'dark', label: 'To\'q', icon: Moon },
        { id: 'system', label: 'Tizim', icon: Laptop }
      ].map((t) => (
        <button 
          key={t.id} 
          onClick={() => apply(t.id)}
          className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
            value === t.id 
            ? 'bg-brand-dark border-brand-dark text-brand-light' 
            : 'bg-bg border-border text-ink-muted'
          }`}
        >
          <t.icon size={18} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
