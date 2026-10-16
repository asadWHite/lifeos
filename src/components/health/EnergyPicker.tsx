"use client";

import { useState, useTransition } from "react";
import { BatteryFull, BatteryLow, BatteryMedium } from "lucide-react";
import { Storage, generateId } from "@/lib/client/storage";
import { todayInTz } from "@/lib/time";

const OPTIONS = [
  { id: "energized", label: "Energized", icon: BatteryFull },
  { id: "okay", label: "Okay", icon: BatteryMedium },
  { id: "tired", label: "Tired", icon: BatteryLow },
] as const;

/** One-tap, optional daily energy check-in. */
export function EnergyPicker({ current }: { current: string | null }) {
  const [selected, setSelected] = useState<string | null>(current);
  const [, start] = useTransition();

  function pick(id: string) {
    setSelected(id);
    start(() => {
      const pid = Storage.getCurrentProfileId();
      if (!pid) return;
      const p = Storage.getProfile(pid);
      if (!p) return;
      const today = todayInTz(p.timezone);
      
      const existing = Storage.getCheckins().find(c => c.profileId === pid && c.day === today);
      if (existing) {
        Storage.saveCheckin({ ...existing, energy: id });
      } else {
        Storage.saveCheckin({
          id: generateId(), profileId: pid, day: today,
          energy: id, activityMinutes: null, note: null, createdAt: new Date()
        });
      }
    });
  }

  return (
    <div className="flex gap-2" role="group" aria-label="How are you feeling today?">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className="chip"
          data-selected={selected === o.id}
          aria-pressed={selected === o.id}
          onClick={() => pick(o.id)}
        >
          <o.icon size={15} aria-hidden />
          {o.label}
        </button>
      ))}
    </div>
  );
}
