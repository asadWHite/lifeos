"use client";

import { useState, useTransition } from "react";
import { BatteryFull, BatteryLow, BatteryMedium } from "lucide-react";
import { saveCheckinAction } from "@/server/actions/sleep";

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
    const prev = selected;
    setSelected(id);
    start(async () => {
      const res = await saveCheckinAction({ energy: id as "energized" | "okay" | "tired" });
      if (!res.ok) setSelected(prev);
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
