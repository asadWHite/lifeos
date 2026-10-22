"use client";

import { DEMO_SLEEP_SCHEDULE, DEMO_SLEEP_ROWS, DEMO_SLEEP_CHART, TODAY, TZ } from "@/lib/demo-data";
import { formatDuration } from "@/lib/dates";
import { SleepModule } from "@/components/sleep-module";

export function PreviewSleep() {
  const finished = DEMO_SLEEP_ROWS.filter((r) => r.endedAt && r.durationMin != null);
  const avg7 = finished.length ? Math.round(finished.reduce((a, r) => a + (r.durationMin ?? 0), 0) / finished.length) : null;
  const greenCount = finished.filter((r) => r.status === "green").length;

  return (
    <SleepModule
      today={TODAY}
      timezone={TZ}
      schedule={DEMO_SLEEP_SCHEDULE}
      defaults={{ bedtime: DEMO_SLEEP_SCHEDULE.bedtime, wakeTime: DEMO_SLEEP_SCHEDULE.wakeTime, toleranceMin: DEMO_SLEEP_SCHEDULE.toleranceMin }}
      rows={DEMO_SLEEP_ROWS}
      active={null}
      stats={{ avg7, greenCount, totalSessions: finished.length }}
      chart={DEMO_SLEEP_CHART}
      phoneNotes={["Under 30 min of phone before bed", "Phone within 10 min of waking"]}
    />
  );
}
