"use client";

import { useEffect, useState } from "react";
import { Activity, BedDouble } from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { guidanceForAge, statusForSession, STATUS_COPY, weeklySleepStats, bedtimeForWake, type AgeGroup } from "@/lib/sleep";
import { dayPartsInTz, formatDayShort, formatDuration, lastNDays, todayInTz } from "@/lib/time";
import { SectionHeader, StatusPill } from "@/components/ui";
import { SleepActions, SleepHistoryList } from "@/components/sleep/SleepControls";
import { EnergyPicker } from "@/components/health/EnergyPicker";
import { ActivityLogger } from "@/components/health/ActivityLogger";

export default function HealthPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    const prefs = Storage.getPrefs(pid);
    if (!profile || !prefs) return;

    const tz = profile.timezone;
    const today = todayInTz(tz);
    const target = prefs.sleepTargetMinutes;

    const allSleeps = Storage.getSleeps().filter(s => s.profileId === pid);
    const activeSleep = allSleeps.find(s => !s.endedAt) || null;
    const sessions = allSleeps.filter(s => s.endedAt).sort((a,b) => +new Date(b.startedAt) - +new Date(a.startedAt)).slice(0,30);
    
    const allCheckins = Storage.getCheckins().filter(c => c.profileId === pid);
    const checkin = allCheckins.find(c => c.day === today) || null;
    
    const start = new Date(`${today}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    const startIso = start.toISOString().slice(0,10);
    const weekCheckins = allCheckins.filter(c => c.day >= startIso && c.day <= today);

    setData({ profile, prefs, tz, today, target, activeSleep, sessions, checkin, weekCheckins });
  }, []);

  if (!data) return null;
  const { profile, prefs, tz, today, target, activeSleep, sessions, checkin, weekCheckins } = data;

  const toLocal = (d: Date) => {
    const p = dayPartsInTz(tz, d);
    return { minutesAfterMidnight: p.hour * 60 + p.minute, dateIso: p.iso };
  };
  const stats = weeklySleepStats(sessions.map((s:any) => ({...s, startedAt: new Date(s.startedAt), endedAt: s.endedAt?new Date(s.endedAt):null})), toLocal, today);

  const days = lastNDays(tz, 7).map((iso) => {
    const session = sessions.find((s:any) => dayPartsInTz(tz, new Date(s.startedAt)).iso === iso);
    const c = weekCheckins.find((w:any) => w.day === iso);
    return {
      iso, label: formatDayShort(iso),
      sleepMinutes: session?.durationMinutes ?? null,
      energy: c?.energy ?? null, activityMinutes: c?.activityMinutes ?? null,
    };
  });

  const lastNight = sessions[0] ?? null;
  const lastStatus = lastNight?.durationMinutes != null ? statusForSession(lastNight.durationMinutes, target) : null;
  const guidance = guidanceForAge((prefs.ageGroup as AgeGroup) ?? null);
  const suggestedBedtime = prefs.wakeTime && target ? bedtimeForWake(prefs.wakeTime, target) : null;

  const maxBarMinutes = Math.max(target ?? 480, ...days.map((d) => d.sleepMinutes ?? 0)) * 1.1;

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Health</h1>
        <p className="mt-1 text-[14px] text-ink2">
          A light, honest view of your rest and energy. Nothing here is medical advice.
        </p>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6" aria-label="Sleep summary">
          <SectionHeader title="Sleep" subtitle={lastNight ? "Last night" : "Get started"} />
          <div className="mt-4">
            {lastNight?.durationMinutes != null ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[30px] font-bold tracking-tight text-ink">{formatDuration(lastNight.durationMinutes)}</span>
                  {target != null && <span className="text-[13px] text-ink3">of {formatDuration(target)} target</span>}
                </div>
                {lastStatus && (
                  <StatusPill tone={STATUS_COPY[lastStatus].tone === "green" ? "green" : STATUS_COPY[lastStatus].tone === "amber" ? "amber" : "red"}>
                    {STATUS_COPY[lastStatus].label}
                  </StatusPill>
                )}
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink3">This is time in bed — an estimate only, never a measure of sleep quality or a diagnosis.</p>
              </div>
            ) : (
              <p className="text-[13.5px] leading-relaxed text-ink2">No sessions recorded yet. Start tracking tonight — tap the button when you get into bed and when you wake up.</p>
            )}

            <div className="mt-5 border-t border-line pt-5">
              <SleepActions active={activeSleep ? { id: activeSleep.id, startedAt: activeSleep.startedAt } : null} timezone={tz} targetMinutes={target} bedtimeSuggestion={prefs.bedtime ?? suggestedBedtime} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">7-day avg</p>
                <p className="mt-0.5 text-[15px] font-bold text-ink">{stats.averageMinutes != null ? formatDuration(stats.averageMinutes) : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Nights</p>
                <p className="mt-0.5 text-[15px] font-bold text-ink">{stats.nightsTracked}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Bedtime</p>
                <p className="mt-0.5 text-[15px] font-bold text-ink">{stats.bedtimeConsistency != null ? `±${stats.bedtimeConsistency}m` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">Wake</p>
                <p className="mt-0.5 text-[15px] font-bold text-ink">{stats.wakeConsistency != null ? `±${stats.wakeConsistency}m` : "—"}</p>
              </div>
            </div>
            {(stats.bedtimeConsistency == null || stats.wakeConsistency == null) && (
              <p className="mt-3 text-[11.5px] text-ink3">Consistency appears once at least 3 nights are tracked in the current week.</p>
            )}
          </div>
        </section>

        <section className="card p-5 sm:p-6" aria-label="Daily check-in">
          <SectionHeader title="Daily check-in" subtitle="Optional and quick — skip it anytime" />
          <div className="mt-4 space-y-5">
            <div>
              <span className="label">How are you feeling today?</span>
              <EnergyPicker current={checkin?.energy ?? null} />
            </div>
            <ActivityLogger initialMinutes={checkin?.activityMinutes ?? null} initialNote={checkin?.note ?? null} />
          </div>
        </section>
      </div>

      <section className="card mt-5 p-5 sm:p-6" aria-label="Weekly overview">
        <SectionHeader title="This week" subtitle={`Sleep vs your ${formatDuration(target)} target · energy · activity`} />
        <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3" role="img" aria-label="Weekly sleep, energy and activity chart">
          {days.map((d) => {
            const status = d.sleepMinutes != null ? statusForSession(d.sleepMinutes, target) : null;
            const tone = d.sleepMinutes == null ? "bg-line" : status == null ? "bg-line-strong" : STATUS_COPY[status].tone === "green" ? "bg-accent" : STATUS_COPY[status].tone === "amber" ? "bg-amber" : "bg-red";
            const height = d.sleepMinutes != null ? Math.max(6, (d.sleepMinutes / maxBarMinutes) * 96) : 4;
            return (
              <div key={d.iso} className="flex flex-col items-center gap-1.5">
                <div className="flex h-24 w-full items-end justify-center">
                  <div className={`w-full max-w-7 rounded-md ${tone}`} style={{ height }} title={d.sleepMinutes != null ? `${d.label}: ${formatDuration(d.sleepMinutes)}` : `${d.label}: not tracked`} />
                </div>
                <span className="text-[11px] font-medium text-ink3">{d.label}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${d.energy === "energized" ? "bg-accent" : d.energy === "okay" ? "bg-amber" : d.energy === "tired" ? "bg-red" : "bg-line"}`} title={d.energy ? `Energy: ${d.energy}` : "No check-in"} />
                <span className="flex h-3 items-center text-[10px] font-semibold text-ink3">{d.activityMinutes != null ? `${d.activityMinutes}m` : ""}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card mt-5 p-5 sm:p-6" aria-label="Sleep history">
        <SectionHeader title="Recent nights" subtitle="Correct a session if you forgot to stop tracking" action={<BedDouble size={16} className="text-ink3" />} />
        <div className="mt-2">
          {sessions.length === 0 ? (
            <p className="py-4 text-[13.5px] text-ink2">Nothing recorded yet. Your sessions will appear here once you track your first night.</p>
          ) : (
            <SleepHistoryList sessions={sessions} timezone={tz} targetMinutes={target} />
          )}
        </div>
      </section>

      <div className="mt-5 rounded-[14px] border border-line bg-sunken p-4 text-[12.5px] leading-relaxed text-ink2">
        <p className="flex items-start gap-2">
          <Activity size={14} className="mt-0.5 shrink-0 text-ink3" />
          LIFEOS is not a medical device. Durations are self-reported estimates, and guidance (~{guidance.label} for your age group) is general information — if you&rsquo;re concerned about your sleep or health, please talk to a qualified professional.
        </p>
      </div>
    </div>
  );
}
