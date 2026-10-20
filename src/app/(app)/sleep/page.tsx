import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { sleepSchedules, sleepSessions } from "@/db/schema";
import { addDays, todayInTz } from "@/lib/dates";
import { sleepDefaults } from "@/lib/personalize";
import { complianceStatus, minutesOfDayInTz, sessionDurationMin, type SleepStatus } from "@/lib/sleep";
import { toSleepScheduleDTO, toSleepSessionDTO } from "@/lib/dto";
import { SleepModule } from "@/components/sleep-module";

export const metadata: Metadata = { title: "Sleep" };
export const dynamic = "force-dynamic";

export interface SleepRow {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  note: string;
  durationMin: number | null;
  status: SleepStatus;
  startLabel: string;
  endLabel: string | null;
}

const PHONE_LABELS: Record<string, string> = {
  none: "Phone away before bed",
  under_30: "Under 30 min of phone before bed",
  over_30: "30+ min of phone before bed",
  until_sleep: "Phone usually until falling asleep",
  within_10: "Phone within 10 min of waking",
  immediately: "Phone is the first thing after waking",
};

export default async function SleepPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const tz = user.timezone;
  const today = todayInTz(tz);

  const [scheduleRows, sessionRows] = await Promise.all([
    db.select().from(sleepSchedules).where(eq(sleepSchedules.userId, user.id)).limit(1),
    db.select().from(sleepSessions).where(eq(sleepSessions.userId, user.id)).orderBy(desc(sleepSessions.startedAt)).limit(60),
  ]);
  const schedule = scheduleRows[0] ?? null;
  const defaults = sleepDefaults(user);
  const eff = schedule ?? { bedtime: defaults.bedtime, wakeTime: defaults.wakeTime, toleranceMin: 15 };

  const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const rows: SleepRow[] = sessionRows.map((s) => {
    const durationMin = sessionDurationMin(s.startedAt, s.endedAt);
    const status = complianceStatus({
      durationMin,
      actualWakeMin: s.endedAt ? minutesOfDayInTz(s.endedAt, tz) : null,
      targetWakeTime: eff.wakeTime,
      toleranceMin: eff.toleranceMin,
    });
    return {
      id: s.id,
      date: s.date,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt ? s.endedAt.toISOString() : null,
      note: s.note,
      durationMin,
      status,
      startLabel: new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(s.startedAt),
      endLabel: s.endedAt ? new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(s.endedAt) : null,
    };
  });

  const finished = rows.filter((r) => r.endedAt && r.durationMin != null);
  const last7 = finished.filter((r) => r.date > addDays(today, -8) && r.date <= today);
  const avg7 = last7.length ? Math.round(last7.reduce((a, r) => a + (r.durationMin ?? 0), 0) / last7.length) : null;
  const greenCount = finished.filter((r) => r.status === "green").length;

  // Chart: last 7 days ending today
  const chartDays = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const chart = chartDays.map((d) => {
    const row = rows.find((r) => r.date === d && r.durationMin != null);
    const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(new Date(`${d}T12:00:00Z`));
    return {
      label,
      sublabel: row && row.durationMin != null ? `${Math.floor(row.durationMin / 60)}h${String(row.durationMin % 60).padStart(2, "0")}` : "",
      value: row?.durationMin ?? 0,
      tone: (row ? (row.status === "green" ? "ok" : row.status === "yellow" ? "warn" : row.status === "red" ? "bad" : "muted") : "muted") as "ok" | "warn" | "bad" | "muted",
    };
  });

  const active = rows.find((r) => !r.endedAt) ?? null;

  const phoneNotes = [user.phoneHabits?.beforeBed, user.phoneHabits?.afterWake]
    .map((k) => (k ? PHONE_LABELS[k] : null))
    .filter(Boolean) as string[];

  return (
    <SleepModule
      today={today}
      timezone={tz}
      schedule={schedule ? toSleepScheduleDTO(schedule) : null}
      defaults={eff}
      rows={rows}
      active={active}
      stats={{ avg7, greenCount, totalSessions: finished.length }}
      chart={chart}
      phoneNotes={phoneNotes}
    />
  );
}
