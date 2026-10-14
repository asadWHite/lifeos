import Link from "next/link";
import { ArrowUpRight, Brain, Download, Info, KeyRound, ShieldCheck } from "lucide-react";
import { requireOnboarded } from "@/server/session";
import { memoryFacts } from "@/lib/personalization";
import { sleepGuidanceLine } from "@/server/assistant";
import { SectionHeader } from "@/components/ui";
import {
  AccountActions,
  AppearanceForm,
  PlanningForm,
  ProfileForm,
  RetakeButton,
  SleepForm,
} from "@/components/settings/SettingsForms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireOnboarded();
  const { profile, prefs } = session;
  const aiConfigured = Boolean(process.env.OPENAI_API_KEY);

  const facts = memoryFacts({
    ageGroup: prefs.ageGroup,
    lifeStage: prefs.lifeStage,
    lifeStageOther: prefs.lifeStageOther,
    interests: prefs.interests,
    interestsOther: prefs.interestsOther,
    objectives: prefs.objectives,
    objectivesOther: prefs.objectivesOther,
    wakeTime: prefs.wakeTime,
    bedtime: prefs.bedtime,
    planningStyle: prefs.planningStyle,
    difficulties: prefs.difficulties,
    phoneBeforeBed: prefs.phoneBeforeBed,
    weekendVaries: prefs.weekendVaries,
  });

  return (
    <div className="animate-rise">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-[14px] text-ink2">
          Everything LIFEOS knows about you is explicit, visible, and editable here.
        </p>
      </header>

      <div className="mt-7 space-y-5">
        <section className="card p-5 sm:p-6">
          <SectionHeader title="Profile" subtitle="Your name and timezone" />
          <div className="mt-5">
            <ProfileForm name={profile.name} timezone={profile.timezone} />
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeader
            title="Sleep & schedule"
            subtitle={`Target, rhythm and wind-down — ${sleepGuidanceLine(prefs.ageGroup)}. Not medical advice.`}
          />
          <div className="mt-5">
            <SleepForm
              targetMinutes={prefs.sleepTargetMinutes ?? 480}
              wakeTime={prefs.wakeTime}
              bedtime={prefs.bedtime}
              phoneBeforeBed={prefs.phoneBeforeBed}
            />
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
            <SectionHeader
              title="What LIFEOS knows about you"
              subtitle="The complete list — nothing else is stored or inferred"
            />
            <RetakeButton />
          </div>
          {facts.length === 0 ? (
            <p className="mt-4 text-[13.5px] text-ink2">
              No preferences saved yet. Retake the quiz to personalize LIFEOS.
            </p>
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
            LIFEOS deliberately avoids inferred psychological profiles. The assistant uses only
            this explicit list plus your real tasks, goals and sleep totals.
          </p>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeader
            title="AI assistant"
            subtitle={aiConfigured ? "A model is connected" : "No AI provider configured"}
            action={<Brain size={16} className="text-ink3" />}
          />
          <div className="mt-4 flex items-start gap-3">
            <KeyRound size={15} className="mt-0.5 shrink-0 text-ink3" />
            <div className="text-[13px] leading-relaxed text-ink2">
              {aiConfigured ? (
                <p>
                  Using <code className="rounded bg-sunken px-1.5 py-0.5 text-[12px]">{process.env.OPENAI_MODEL ?? "gpt-4o-mini"}</code> via your
                  OpenAI-compatible endpoint. Replies from the model are labelled “AI model” in Brain;
                  fallbacks are labelled “built-in rules”.
                </p>
              ) : (
                <p>
                  Brain works today with transparent, built-in rules. To enable a real model add{" "}
                  <code className="rounded bg-sunken px-1.5 py-0.5 text-[12px]">OPENAI_API_KEY</code> (optionally{" "}
                  <code className="rounded bg-sunken px-1.5 py-0.5 text-[12px]">OPENAI_BASE_URL</code>,{" "}
                  <code className="rounded bg-sunken px-1.5 py-0.5 text-[12px]">OPENAI_MODEL</code>) to your server
                  environment and restart. Keys are read server-side only and are never exposed to the browser.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeader title="Your data" subtitle="Export or erase — it's yours" />
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/api/export" className="btn btn-secondary btn-sm" download>
                <Download size={14} />
                Export everything (JSON)
              </Link>
              <Link href="/health" className="btn btn-ghost btn-sm">
                Review health data
                <ArrowUpRight size={13} />
              </Link>
            </div>
            <AccountActions />
          </div>
        </section>

        <section className="rounded-[14px] border border-line bg-sunken p-5 text-[12.5px] leading-relaxed text-ink2">
          <p className="flex items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0 text-ink3" />
            <span>
              <strong className="font-semibold text-ink">About this space.</strong> Profiles are
              local to this device (a development identity, not secure sign-in). The architecture is
              Supabase-ready: connect Supabase Auth + Postgres and swap the session adapter to get
              real multi-device accounts with row-level security, per the project README. Health
              content is informational only, and accounts for under-13s are intentionally gated
              until guardian-consent safeguards exist.
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
