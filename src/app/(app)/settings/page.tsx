"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Brain, Download, Info, KeyRound, ShieldCheck } from "lucide-react";
import { Storage } from "@/lib/client/storage";
import { memoryFacts } from "@/lib/personalization";
import { SectionHeader } from "@/components/ui";
import { AccountActions, AppearanceForm, PlanningForm, ProfileForm, RetakeButton, SleepForm } from "@/components/settings/SettingsForms";
import { guidanceForAge, type AgeGroup } from "@/lib/sleep";

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const profile = Storage.getProfile(pid);
    const prefs = Storage.getPrefs(pid);
    if (!profile || !prefs) return;
    setData({ profile, prefs });
  }, []);

  if (!data) return null;
  const { profile, prefs } = data;

  const facts = memoryFacts({
    ageGroup: prefs.ageGroup, lifeStage: prefs.lifeStage, lifeStageOther: prefs.lifeStageOther,
    interests: prefs.interests, interestsOther: prefs.interestsOther, objectives: prefs.objectives,
    objectivesOther: prefs.objectivesOther, wakeTime: prefs.wakeTime, bedtime: prefs.bedtime,
    planningStyle: prefs.planningStyle, difficulties: prefs.difficulties, phoneBeforeBed: prefs.phoneBeforeBed,
    weekendVaries: prefs.weekendVaries,
  });

  const target = prefs.sleepTargetMinutes ?? 480;
  const guidance = guidanceForAge((prefs.ageGroup as AgeGroup) ?? null);

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-[14px] text-ink2">Everything LIFEOS knows about you is explicit, visible, and editable here.</p>
      </header>

      <div className="mt-7 space-y-5">
        <section className="card p-5 sm:p-6">
          <SectionHeader title="Profile" subtitle="Your name and timezone" />
          <div className="mt-5">
            <ProfileForm name={profile.name} timezone={profile.timezone} />
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeader title="Sleep & schedule" subtitle={`Target, rhythm and wind-down — ${guidance.label} is typical for your age group.`} />
          <div className="mt-5">
            <SleepForm targetMinutes={target} wakeTime={prefs.wakeTime} bedtime={prefs.bedtime} phoneBeforeBed={prefs.phoneBeforeBed} />
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeader title="Planning" subtitle="How LIFEOS shows up on Home" />
          <div className="mt-5">
            <PlanningForm planningStyle={prefs.planningStyle} hidden={prefs.hiddenSections} />
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeader title="Appearance" subtitle="Light is the primary experience; dark follows your choice" />
          <div className="mt-4">
            <AppearanceForm theme={prefs.theme} />
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <SectionHeader title="What LIFEOS knows about you" subtitle="The complete list — nothing else is stored or inferred" />
            <RetakeButton />
          </div>
          {facts.length === 0 ? (
            <p className="mt-4 text-[13.5px] text-ink2">No preferences saved yet. Retake the quiz to personalize LIFEOS.</p>
          ) : (
            <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink3">{f.label}</dt>
                  <dd className="mt-0.5 text-[14px] font-medium text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-ink3">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />
            LIFEOS deliberately avoids inferred psychological profiles. The assistant uses only this explicit list plus your real tasks, goals and sleep totals.
          </p>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeader title="AI assistant" subtitle="Local-First Rules Engine" action={<Brain size={16} className="text-ink3" />} />
          <div className="mt-4 flex items-start gap-3">
            <KeyRound size={15} className="mt-0.5 shrink-0 text-ink3" />
            <div className="text-[13px] leading-relaxed text-ink2">
              <p>
                Because this is running in Local-First Mode (in your browser), Brain relies entirely on transparent, built-in rules that interact with your local data without sending it to external language models.
              </p>
            </div>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeader title="Your data" subtitle="Export or erase — it's yours" />
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const payload = {
                    format: "lifeos-local-export-v1",
                    exportedAt: new Date().toISOString(),
                    profile, prefs,
                    tasks: Storage.getTasks().filter(t => t.profileId === profile.id),
                    goals: Storage.getGoals().filter(g => g.profileId === profile.id),
                    sleep: Storage.getSleeps().filter(s => s.profileId === profile.id),
                    checkins: Storage.getCheckins().filter(c => c.profileId === profile.id),
                    messages: Storage.getMessages().filter(m => m.profileId === profile.id)
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "lifeos-export.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={14} /> Export everything (JSON)
              </button>
              <Link href="/health" className="btn btn-ghost btn-sm">
                Review health data <ArrowUpRight size={13} />
              </Link>
            </div>
            <AccountActions />
          </div>
        </section>
      </div>
    </div>
  );
}
