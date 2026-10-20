"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui";

interface ReminderTask {
  id: string;
  title: string;
  startTime: string | null;
  status: string;
}

/* In-app reminder engine for tasks scheduled today.
 * - Fires at the start time (or `lead` minutes earlier for "firm" style).
 * - Uses browser Notifications when permission was granted; otherwise an
 *   in-app toast. Each task fires at most once per app session.
 * - Honest limitation: while LifeOS is closed, delivery requires push
 *   infrastructure (service worker + server scheduler), documented in the
 *   README; a JS timer alone cannot do that. */
export function ReminderWatcher({ timezone, enabled, style }: { timezone: string; enabled: boolean; style: string }) {
  const { push } = useToast();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const leadMin = style === "firm" ? 10 : 0;
    const fired = new Set<string>();
    try {
      const raw = sessionStorage.getItem("lifeos_reminded");
      if (raw) for (const k of JSON.parse(raw) as string[]) fired.add(k);
    } catch { /* ignore */ }

    let tasks: ReminderTask[] = [];
    async function load() {
      try {
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
        const res = await fetch(`/api/tasks?date=${today}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { tasks?: ReminderTask[] };
        tasks = data.tasks ?? [];
      } catch { /* network hiccup: retry on next interval */ }
    }

    function tick() {
      if (cancelled) return;
      const now = new Date();
      const hm = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
      const nowMin = Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
      for (const t of tasks) {
        if (!t.startTime || t.status === "completed") continue;
        const start = Number(t.startTime.slice(0, 2)) * 60 + Number(t.startTime.slice(3, 5));
        if (fired.has(t.id)) continue;
        if (nowMin >= start - leadMin && nowMin <= start) {
          fired.add(t.id);
          try { sessionStorage.setItem("lifeos_reminded", JSON.stringify([...fired])); } catch { /* ignore */ }
          const body = leadMin > 0 ? `Starts in ${leadMin} minutes — ${t.startTime}` : `Starting now — ${t.startTime}`;
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification(t.title, { body, tag: t.id }); } catch { push({ title: t.title, body, tone: "info" }); }
          } else {
            push({ title: t.title, body, tone: "info" });
          }
        }
      }
    }

    load().then(tick);
    const interval = setInterval(tick, 30_000);
    const reload = setInterval(load, 5 * 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(reload);
      window.removeEventListener("focus", onFocus);
    };
  }, [timezone, enabled, style, push]);

  return null;
}
