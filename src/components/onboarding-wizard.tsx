"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckIcon, Sparkles } from "lucide-react";
import { Button, Field, Input, Select, Textarea, cn } from "@/components/ui";
import {
  HABIT_FOCUS_OPTIONS,
  INTEREST_OPTIONS,
  LIFE_SITUATIONS,
  RESPONSIBILITY_OPTIONS,
} from "@/lib/validation";

/* ---------- labels ---------- */
const SITUATION_LABELS: Record<string, { title: string; body: string }> = {
  school_student: { title: "School student", body: "Classes, homework, exams" },
  university_student: { title: "University student", body: "Lectures, deadlines, campus life" },
  working_adult: { title: "Working adult", body: "A steady job shapes the week" },
  self_employed: { title: "Self-employed", body: "I set my own structure" },
  multiple: { title: "Juggling responsibilities", body: "Work, family, study — all of it" },
  other: { title: "Something else", body: "My situation doesn't fit a box" },
};
const RESP_LABELS: Record<string, string> = {
  school: "School", university: "University", work: "Work", study: "Study",
  family: "Family", fitness: "Fitness", projects: "Personal projects", other: "Other",
};
const INTEREST_LABELS: Record<string, string> = {
  education: "Education", languages: "Learning languages", health: "Health & fitness",
  sleep: "Better sleep", productivity: "Productivity", growth: "Personal development",
  work: "Work", creative: "Creative projects", social: "Social life", habits: "Building habits",
};
const HABIT_LABELS: Record<string, string> = {
  sleep: "Consistent sleep", study: "Regular study", exercise: "Exercise",
  reading: "Reading", planning: "Planning my day", less_phone: "Less mindless phone time", projects: "Personal projects",
};
const TIMEZONES = [
  "Asia/Tashkent", "Asia/Almaty", "Asia/Dubai", "Europe/Moscow", "Europe/Istanbul",
  "Europe/Berlin", "Europe/London", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "Asia/Seoul", "Asia/Tokyo", "Australia/Sydney",
];

export interface OnboardingData {
  name: string; nickname: string; dob: string; timezone: string;
  lifeSituation: string | null; responsibilities: string[]; interests: string[];
  goalNotes: string; wakeTime: string; bedTime: string; commitment: string; focusTime: string;
  phoneBeforeBed: string; phoneAfterWake: string; habitFocus: string[];
  reminderStyle: string; planningStyle: string;
}

const STEP_META = [
  { key: "welcome", title: "Welcome" },
  { key: "profile", title: "About you" },
  { key: "situation", title: "Life situation" },
  { key: "responsibilities", title: "Responsibilities" },
  { key: "interests", title: "Interests" },
  { key: "goals", title: "Goals" },
  { key: "rhythm", title: "Daily rhythm" },
  { key: "phone", title: "Sleep & phone" },
  { key: "style", title: "Your style" },
] as const;

function OptionCard({ selected, onClick, title, body }: { selected: boolean; onClick: () => void; title: string; body?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative rounded-2xl border p-4 text-left transition-all duration-150",
        selected
          ? "border-accent/60 bg-accent/10 shadow-[0_8px_24px_-12px_rgba(255,99,60,0.5)]"
          : "border-[var(--c-line)] bg-[var(--c-raised)] hover:border-[var(--c-line-strong)]",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-[15px] font-semibold">{title}</span>
          {body && <span className="mt-0.5 block text-[13px] text-sub">{body}</span>}
        </span>
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border transition-colors", selected ? "border-accent bg-accent text-white" : "border-[var(--c-line-strong)] text-transparent")} aria-hidden>
          <CheckIcon className="size-3" />
        </span>
      </span>
    </button>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150",
        selected ? "border-accent/60 bg-accent/12 text-accent" : "border-[var(--c-line)] text-sub hover:border-[var(--c-line-strong)] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function OnboardingWizard({ initialStep, initial }: { initialStep: number; initial: OnboardingData }) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [data, setData] = useState<OnboardingData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectedTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tashkent"; } catch { return "Asia/Tashkent"; }
  }, []);
  const tzOptions = useMemo(() => (TIMEZONES.includes(data.timezone) ? TIMEZONES : [data.timezone, ...TIMEZONES].slice(0, 14)), [data.timezone]);

  function set<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }
  function toggleIn(key: "responsibilities" | "interests" | "habitFocus", value: string) {
    setData((d) => {
      const arr = d[key];
      return { ...d, [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  }

  /** Persist current progress; returns success. Answers are never lost silently. */
  async function save(nextStep: number, complete = false): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, step: nextStep, complete }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "Could not save. Your answers are still here — try again.");
        return false;
      }
      return true;
    } catch {
      setError("Network error — your answers are still here. Check your connection and retry.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const stepValid =
    step === 1 ? data.name.trim().length > 0 :
    step === 2 ? !!data.lifeSituation :
    true;

  async function next() {
    if (!stepValid) return;
    const target = Math.min(step + 1, STEP_META.length - 1);
    const ok = await save(target, false);
    if (ok) setStep(target);
  }
  async function back() {
    const target = Math.max(step - 1, 0);
    await save(target, false); // persist even when moving backwards
    setStep(target);
  }
  async function finish() {
    const ok = await save(STEP_META.length - 1, true);
    if (ok) {
      router.push("/today");
      router.refresh();
    }
  }

  const progress = ((step + 1) / STEP_META.length) * 100;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">LifeOS · TimeFlow</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--c-line)]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-faint">{step + 1} / {STEP_META.length}</span>
        </div>
        <p className="mt-2 text-[13px] font-medium text-sub">{STEP_META[step].title}</p>
      </header>

      <div key={step} className="glass animate-pop flex-1 rounded-3xl p-6 sm:p-8">
        {step === 0 && (
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent"><Sparkles className="size-6" aria-hidden /></div>
            <h1 className="mt-4 font-display text-3xl font-semibold text-balance">Let&rsquo;s shape LifeOS around your life</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-sub">
              A few short questions — about two minutes. Your answers tune the TimeFlow timeline,
              habit suggestions and your sleep schedule. Anything optional can be skipped and edited later in Profile.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-sub">
              <li className="flex gap-2"><CheckIcon className="mt-0.5 size-4 text-ok" aria-hidden /> Saved step by step — leave anytime, resume where you left off</li>
              <li className="flex gap-2"><CheckIcon className="mt-0.5 size-4 text-ok" aria-hidden /> No made-up stats: LifeOS only shows what you actually record</li>
              <li className="flex gap-2"><CheckIcon className="mt-0.5 size-4 text-ok" aria-hidden /> Nothing sensitive is required</li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5">
            <h2 className="font-display text-2xl font-semibold">First, the basics</h2>
            <Field label="Full name" htmlFor="ob-name" error={data.name.trim() ? null : "We need at least a name to greet you properly."} hint="Used across your dashboard and reports.">
              <Input id="ob-name" value={data.name} onChange={(e) => set("name", e.target.value)} maxLength={80} autoComplete="name" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nickname" htmlFor="ob-nick" optional hint="What should we call you day to day?">
                <Input id="ob-nick" value={data.nickname} onChange={(e) => set("nickname", e.target.value)} maxLength={40} />
              </Field>
              <Field label="Date of birth" htmlFor="ob-dob" optional hint="Only if you want age-aware insights.">
                <Input id="ob-dob" type="date" value={data.dob} onChange={(e) => set("dob", e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </Field>
            </div>
            <Field label="Timezone" htmlFor="ob-tz" hint={`Detected: ${detectedTz}. Dates and reminders follow this setting.`}>
              <Select id="ob-tz" value={data.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {tzOptions.map((tz) => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
              </Select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-2xl font-semibold">What does life look like right now?</h2>
            <p className="mt-1.5 text-sm text-sub">This shapes your default schedule and categories.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {LIFE_SITUATIONS.map((s) => (
                <OptionCard key={s} selected={data.lifeSituation === s} onClick={() => set("lifeSituation", s)} title={SITUATION_LABELS[s].title} body={SITUATION_LABELS[s].body} />
              ))}
            </div>
            {!data.lifeSituation && <p className="mt-3 text-[13px] text-faint">Choose one to continue — it keeps the defaults honest.</p>}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-2xl font-semibold">Your weekly responsibilities</h2>
            <p className="mt-1.5 text-sm text-sub">Pick everything that regularly claims your time. Optional.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {RESPONSIBILITY_OPTIONS.map((r) => (
                <Chip key={r} selected={data.responsibilities.includes(r)} onClick={() => toggleIn("responsibilities", r)}>{RESP_LABELS[r]}</Chip>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-display text-2xl font-semibold">What matters most to you?</h2>
            <p className="mt-1.5 text-sm text-sub">LifeOS suggests task categories and habits from these. Optional.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((i) => (
                <Chip key={i} selected={data.interests.includes(i)} onClick={() => toggleIn("interests", i)}>{INTEREST_LABELS[i]}</Chip>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-5">
            <div>
              <h2 className="font-display text-2xl font-semibold">One or two goals you care about</h2>
              <p className="mt-1.5 text-sm text-sub">
                Write them in your own words — you can turn them into tracked goals later in Plan. Skipping is fine.
              </p>
            </div>
            <Textarea value={data.goalNotes} onChange={(e) => set("goalNotes", e.target.value)} maxLength={500} placeholder="e.g. Pass my IELTS by June · Exercise 3× a week" aria-label="Your current goals" />
            <p className="text-[13px] text-faint">Tip: pick at most two. Focus beats ambition lists.</p>
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-5">
            <div>
              <h2 className="font-display text-2xl font-semibold">Your daily rhythm</h2>
              <p className="mt-1.5 text-sm text-sub">Used for your sleep schedule and timeline empty states.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Usual wake-up time" htmlFor="ob-wake">
                <Input id="ob-wake" type="time" value={data.wakeTime} onChange={(e) => set("wakeTime", e.target.value)} />
              </Field>
              <Field label="Preferred bedtime" htmlFor="ob-bed">
                <Input id="ob-bed" type="time" value={data.bedTime} onChange={(e) => set("bedTime", e.target.value)} />
              </Field>
            </div>
            <Field label="Fixed daily commitment" htmlFor="ob-commit" optional hint="e.g. School 8:00–14:00, Work 9–18">
              <Input id="ob-commit" value={data.commitment} onChange={(e) => set("commitment", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Best time for focused work" htmlFor="ob-focus" optional hint="e.g. Mornings before anyone messages me">
              <Input id="ob-focus" value={data.focusTime} onChange={(e) => set("focusTime", e.target.value)} maxLength={120} />
            </Field>
          </div>
        )}

        {step === 7 && (
          <div className="grid gap-5">
            <div>
              <h2 className="font-display text-2xl font-semibold">Sleep & phone habits</h2>
              <p className="mt-1.5 text-sm text-sub">Self-reported — LifeOS improves routines from what you tell it, with no secret tracking.</p>
            </div>
            <Field label="Phone use before bed" htmlFor="ob-pb" hint="Shown later as context in your Sleep module.">
              <Select id="ob-pb" value={data.phoneBeforeBed} onChange={(e) => set("phoneBeforeBed", e.target.value)}>
                <option value="">Prefer not to say / not sure</option>
                <option value="none">I put it away before bed</option>
                <option value="under_30">Under 30 minutes</option>
                <option value="over_30">More than 30 minutes</option>
                <option value="until_sleep">Usually until I fall asleep</option>
              </Select>
            </Field>
            <Field label="Phone right after waking" htmlFor="ob-pa">
              <Select id="ob-pa" value={data.phoneAfterWake} onChange={(e) => set("phoneAfterWake", e.target.value)}>
                <option value="">Prefer not to say / not sure</option>
                <option value="none">Not first thing</option>
                <option value="within_10">Within 10 minutes</option>
                <option value="immediately">It&rsquo;s the first thing I reach for</option>
              </Select>
            </Field>
          </div>
        )}

        {step === 8 && (
          <div className="grid gap-6">
            <div>
              <h2 className="font-display text-2xl font-semibold">Fine-tune your style</h2>
              <p className="mt-1.5 text-sm text-sub">Last step — everything here is editable later.</p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-sub">Routines you want to build</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {HABIT_FOCUS_OPTIONS.map((h) => (
                  <Chip key={h} selected={data.habitFocus.includes(h)} onClick={() => toggleIn("habitFocus", h)}>{HABIT_LABELS[h]}</Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Reminder style" htmlFor="ob-rs">
                <Select id="ob-rs" value={data.reminderStyle} onChange={(e) => set("reminderStyle", e.target.value)}>
                  <option value="gentle">Gentle nudges</option>
                  <option value="firm">Direct and firm</option>
                  <option value="minimal">Minimal — only at start times</option>
                </Select>
              </Field>
              <Field label="Planning style" htmlFor="ob-ps">
                <Select id="ob-ps" value={data.planningStyle} onChange={(e) => set("planningStyle", e.target.value)}>
                  <option value="structured">Structured — schedule my whole day</option>
                  <option value="balanced">Balanced — anchors plus flexibility</option>
                  <option value="flexible">Flexible — light lists, go with flow</option>
                </Select>
              </Field>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="animate-in mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-bad">{error}</p>
      )}

      <footer className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={back} disabled={saving}>
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
        ) : <span />}
        {step < STEP_META.length - 1 ? (
          <Button onClick={next} loading={saving} disabled={!stepValid} size="lg">
            Continue <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button onClick={finish} loading={saving} size="lg">
            Enter LifeOS <Sparkles className="size-4" aria-hidden />
          </Button>
        )}
      </footer>
    </main>
  );
}
