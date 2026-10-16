"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ShieldAlert, Sparkles } from "lucide-react";
import {
  AGE_GROUPS,
  COMMITMENTS,
  DIFFICULTIES,
  INTERESTS,
  LIFE_STAGES,
  OBJECTIVES,
  PERSONAL_TIME,
  PHONE_USE,
  PLANNING_STYLES,
  STEPS,
  TOTAL_QUESTION_STEPS,
  toggleDifficulty,
  toggleMulti,
  validateStep,
  type OnboardingValues,
} from "@/lib/onboarding";
import { personalize } from "@/lib/personalization";
import { guidanceForAge, type AgeGroup } from "@/lib/sleep";
import { formatDuration } from "@/lib/time";
import { Storage, generateId } from "@/lib/client/storage";
import { todayInTz } from "@/lib/time";
import { FieldError, Spinner, Toggle } from "@/components/ui";

type Phase = "questions" | "gate" | "summary";

function OptionCard({
  name,
  checked,
  onSelect,
  title,
  description,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-[14px] border p-4 transition-all duration-150 ${
        checked
          ? "border-accent-line bg-accent-soft shadow-sm"
          : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex items-center justify-between gap-3">
        <span>
          <span className={`block text-[14.5px] font-semibold ${checked ? "text-accent-ink" : "text-ink"}`}>
            {title}
          </span>
          {description && (
            <span className="mt-0.5 block text-[12.5px] text-ink2">{description}</span>
          )}
        </span>
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
            checked ? "border-accent bg-accent text-white" : "border-line-strong bg-surface"
          }`}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
      </span>
    </label>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="animate-rise">
      <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink sm:text-[28px]">{title}</h1>
      <p className="mt-2 text-[14px] text-ink2">{subtitle}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

export function OnboardingWizard({
  initialStep,
  initialValues,
  profileName,
}: {
  initialStep: number;
  initialValues: OnboardingValues;
  profileName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [values, setValues] = useState<OnboardingValues>(initialValues);
  const [phase, setPhase] = useState<Phase>("questions");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const def = STEPS[step];
  const isLast = step === TOTAL_QUESTION_STEPS - 1;

  function set<K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }

  async function persist(stepIndex: number) {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const patch: any = { onboardingStep: stepIndex + 1 };
    if (values.ageGroup !== undefined) patch.ageGroup = values.ageGroup ?? null;
    if (values.lifeStage !== undefined) patch.lifeStage = values.lifeStage ?? null;
    if (values.lifeStageOther !== undefined) patch.lifeStageOther = values.lifeStageOther ?? null;
    if (values.interests !== undefined) patch.interests = values.interests;
    if (values.interestsOther !== undefined) patch.interestsOther = values.interestsOther ?? null;
    if (values.objectives !== undefined) patch.objectives = values.objectives;
    if (values.objectivesOther !== undefined) patch.objectivesOther = values.objectivesOther ?? null;
    if (values.wakeTime !== undefined) patch.wakeTime = values.wakeTime ?? null;
    if (values.bedtime !== undefined) patch.bedtime = values.bedtime ?? null;
    if (values.commitments !== undefined) patch.commitments = values.commitments ?? null;
    if (values.personalTime !== undefined) patch.personalTime = values.personalTime ?? null;
    if (values.weekendVaries !== undefined) patch.weekendVaries = values.weekendVaries ?? null;
    if (values.planningStyle !== undefined) patch.planningStyle = values.planningStyle ?? null;
    if (values.difficulties !== undefined) patch.difficulties = values.difficulties;
    if (values.phoneBeforeBed !== undefined) patch.phoneBeforeBed = values.phoneBeforeBed ?? null;
    
    const current = Storage.getPrefs(pid);
    Storage.savePrefs({ ...current, ...patch });
  }

  function back() {
    setError("");
    if (phase === "gate") {
      setPhase("questions");
      return;
    }
    if (step > 0) setStep(step - 1);
  }

  async function saveAndGo(nextStep: number) {
    try {
      await persist(step);
      setStep(nextStep);
    } catch {
      setError("Couldn't save right now — check your connection and try again.");
    }
  }

  async function next() {
    const err = validateStep(step, values);
    if (err) {
      setError(err);
      return;
    }
    if (def.id === "age" && values.ageGroup === "u13") {
      setPhase("gate");
      return;
    }
    if (isLast) {
      await finish();
      return;
    }
    await saveAndGo(step + 1);
  }

  async function skip() {
    await saveAndGo(step + 1);
  }

  async function finish() {
    start(async () => {
      await persist(step);
      const pid = Storage.getCurrentProfileId();
      if (!pid) { setError("Session lost."); return; }
      
      const p = Storage.getProfile(pid);
      if (!p) { setError("Profile not found."); return; }

      const prefs = Storage.getPrefs(pid);
      const target = prefs.sleepTargetMinutes ?? guidanceForAge((prefs.ageGroup as AgeGroup) ?? null).recommendedMinutes;
      const today = todayInTz(p.timezone);

      // Save defaults
      Storage.savePrefs({ ...prefs, sleepTargetMinutes: target, onboardingStep: 0 });

      // Create starter plan
      const existingTasks = Storage.getTasks().filter(t => t.profileId === pid && t.source === "lifeos" && t.status === "todo");
      existingTasks.forEach(t => Storage.deleteTask(t.id));

      for (const t of plan.starterTasks) {
        Storage.saveTask({
          id: generateId(), profileId: pid, title: t.title, priority: t.priority,
          durationMinutes: t.durationMinutes ?? null, dueDate: today, source: "lifeos",
          notes: null, status: "todo", goalId: null, completedAt: null, createdAt: new Date()
        });
      }

      if (plan.suggestedGoal) {
        const hasSame = Storage.getGoals().find(g => g.profileId === pid && g.title === plan.suggestedGoal?.title);
        if (!hasSame) {
          Storage.saveGoal({
            id: generateId(), profileId: pid, title: plan.suggestedGoal.title,
            description: plan.suggestedGoal.description, category: plan.suggestedGoal.category,
            source: "lifeos", targetDate: null, status: "active", metricTarget: null,
            metricUnit: null, metricProgress: 0, createdAt: new Date()
          });
        }
      }

      Storage.saveProfile({ ...p, onboardingCompleted: true });
      setPhase("summary");
    });
  }

  const plan = useMemo(
    () =>
      personalize({
        ageGroup: values.ageGroup,
        lifeStage: values.lifeStage,
        interests: values.interests,
        objectives: values.objectives,
        planningStyle: values.planningStyle,
        difficulties: values.difficulties,
        personalTime: values.personalTime,
        sleepTargetMinutes: null,
      }),
    [values],
  );

  // ------------------------------------------------ under-13 gate ----------
  if (phase === "gate") {
    return (
      <div className="w-full max-w-xl animate-rise">
        <div className="card p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-soft text-amber">
            <ShieldAlert size={20} strokeWidth={1.9} />
          </span>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight text-ink">
            Accounts need to wait until 13+
          </h1>
          <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink2">
            <p>
              Based on that answer, LIFEOS can&rsquo;t open an account right now. Accounts for
              children under 13 require <strong className="font-semibold text-ink">verifiable parent or guardian consent</strong>,
              strict data-minimization, and guardian rights to review and delete the child&rsquo;s data.
            </p>
            <p>
              Those child-privacy safeguards are intentionally not part of this version
              yet — so rather than quietly collecting data from a child, we stop here.
            </p>
          </div>
          <div className="mt-6 flex gap-2">
            <button className="btn btn-secondary" onClick={back}>
              <ArrowLeft size={15} />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- summary ---
  if (phase === "summary") {
    const target = guidanceForAge((values.ageGroup as AgeGroup) ?? null);
    return (
      <div className="w-full max-w-xl animate-rise">
        <div className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-accent-soft text-accent-ink">
            <Sparkles size={24} strokeWidth={1.8} />
          </span>
          <h1 className="mt-4 text-[28px] font-bold tracking-tight text-ink">
            You&rsquo;re all set, {profileName}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[14.5px] leading-relaxed text-ink2">
            LIFEOS configured a small starting point from your answers. Everything below
            was created just now — and everything stays fully editable.
          </p>
        </div>
        <div className="card mt-7 p-6 text-left">
          <h2 className="section-title">What LIFEOS set up for you</h2>
          <ul className="mt-4 space-y-2.5">
            {plan.insights.map((line) => (
              <li key={line} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink2">
                <Check size={15} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
                {line}
              </li>
            ))}
          </ul>
          <div className="divider my-5" />
          <p className="text-[13.5px] text-ink2">
            <strong className="font-semibold text-ink">Starter plan for today:</strong>{" "}
            {plan.starterTasks.map((t) => t.title).join(" · ")}
          </p>
          <p className="mt-2 text-[13.5px] text-ink2">
            <strong className="font-semibold text-ink">Sleep target:</strong>{" "}
            {formatDuration(target.recommendedMinutes)} per night (typical guidance for your age group is {target.label}). Adjust anytime in Settings.
          </p>
        </div>
        <button className="btn btn-primary btn-lg mt-7 w-full" onClick={() => router.push("/home")}>
          Open my dashboard
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------- questions ---
  return (
    <div className="w-full max-w-xl">
      {/* Progress */}
      <div className="mb-8" aria-hidden>
        <div className="flex items-baseline justify-between text-[12.5px] font-semibold text-ink3">
          <span>
            Step {step + 1} of {TOTAL_QUESTION_STEPS}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${((step + 1) / TOTAL_QUESTION_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div key={step}>
        {def.id === "age" && (
          <StepShell title={def.title} subtitle={def.subtitle}>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Age group">
              {AGE_GROUPS.map((o) => (
                <OptionCard
                  key={o.id}
                  name="ageGroup"
                  checked={values.ageGroup === o.id}
                  onSelect={() => set("ageGroup", o.id)}
                  title={o.label}
                />
              ))}
            </div>
          </StepShell>
        )}

        {def.id === "stage" && (
          <StepShell title={def.title} subtitle={def.subtitle}>
            <div className="space-y-2.5" role="radiogroup" aria-label="Life stage">
              {LIFE_STAGES.map((o) => (
                <OptionCard
                  key={o.id}
                  name="lifeStage"
                  checked={values.lifeStage === o.id}
                  onSelect={() => set("lifeStage", o.id)}
                  title={o.label}
                />
              ))}
            </div>
            {values.lifeStage === "other" && (
              <div className="mt-3 animate-fade">
                <label className="label" htmlFor="stage-other">
                  Tell us briefly (optional)
                </label>
                <input
                  id="stage-other"
                  className="input"
                  placeholder="e.g. Between careers, gap year…"
                  value={values.lifeStageOther}
                  onChange={(e) => set("lifeStageOther", e.target.value)}
                  maxLength={120}
                />
              </div>
            )}
          </StepShell>
        )}

        {def.id === "interests" && (
          <StepShell title={def.title} subtitle={def.subtitle}>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
              {INTERESTS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="chip"
                  data-selected={values.interests.includes(o.id)}
                  aria-pressed={values.interests.includes(o.id)}
                  onClick={() => set("interests", toggleMulti(values.interests, o.id))}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {values.interests.includes("other") && (
              <input
                className="input mt-4 animate-fade"
                placeholder="Anything else you're into? (optional)"
                value={values.interestsOther}
                onChange={(e) => set("interestsOther", e.target.value)}
                maxLength={120}
                aria-label="Other interests"
              />
            )}
          </StepShell>
        )}

        {def.id === "objectives" && (
          <StepShell title={def.title} subtitle={def.subtitle}>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Objectives">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="chip"
                  data-selected={values.objectives.includes(o.id)}
                  aria-pressed={values.objectives.includes(o.id)}
                  onClick={() => set("objectives", toggleMulti(values.objectives, o.id))}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {values.objectives.includes("other") && (
              <input
                className="input mt-4 animate-fade"
                placeholder="What's your other objective? (optional)"
                value={values.objectivesOther}
                onChange={(e) => set("objectivesOther", e.target.value)}
                maxLength={120}
                aria-label="Other objectives"
              />
            )}
          </StepShell>
        )}

        {def.id === "schedule" && (
          <StepShell title={def.title} subtitle={def.subtitle}>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="wake-time">
                    Typical wake-up <span className="font-normal text-ink3">(optional)</span>
                  </label>
                  <input
                    id="wake-time"
                    type="time"
                    className="input"
                    value={values.wakeTime ?? ""}
                    onChange={(e) => set("wakeTime", e.target.value || null)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="bed-time">
                    Typical bedtime <span className="font-normal text-ink3">(optional)</span>
                  </label>
                  <input
                    id="bed-time"
                    type="time"
                    className="input"
                    value={values.bedtime ?? ""}
                    onChange={(e) => set("bedtime", e.target.value || null)}
                  />
                </div>
              </div>

              <div>
                <span className="label">Weekday commitments</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Weekday commitments">
                  {COMMITMENTS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="chip"
                      data-selected={values.commitments === o.id}
                      onClick={() => set("commitments", values.commitments === o.id ? null : o.id)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="label">When is your personal time?</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Personal time">
                  {PERSONAL_TIME.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="chip"
                      data-selected={values.personalTime === o.id}
                      onClick={() => set("personalTime", values.personalTime === o.id ? null : o.id)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-[14px] border border-line bg-surface p-4">
                <div>
                  <p className="text-[14px] font-semibold text-ink">Weekends differ</p>
                  <p className="mt-0.5 text-[12.5px] text-ink2">
                    My weekend schedule is very different from weekdays
                  </p>
                </div>
                <Toggle
                  label="Weekends differ from weekdays"
                  checked={values.weekendVaries ?? false}
                  onChange={(v) => set("weekendVaries", v)}
                />
              </div>
            </div>
          </StepShell>
        )}

        {def.id === "planning" && (
          <StepShell title={def.title} subtitle={def.subtitle}>
            <div className="space-y-2.5" role="radiogroup" aria-label="Planning preference">
              {PLANNING_STYLES.map((o) => (
                <OptionCard
                  key={o.id}
                  name="planningStyle"
                  checked={values.planningStyle === o.id}
                  onSelect={() => set("planningStyle", o.id)}
                  title={o.label}
                  description={o.description}
                />
              ))}
            </div>
          </StepShell>
        )}

        {def.id === "difficulties" && (
          <StepShell title={def.title} subtitle={def.subtitle}>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulties">
              {DIFFICULTIES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="chip"
                  data-selected={values.difficulties.includes(o.id)}
                  aria-pressed={values.difficulties.includes(o.id)}
                  onClick={() => set("difficulties", toggleDifficulty(values.difficulties, o.id))}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink3">
              These help LIFEOS decide what to emphasize — they&rsquo;re never used to label or judge you.
            </p>
          </StepShell>
        )}

        {def.id === "phone" && (
          <StepShell title={def.title} subtitle={def.subtitle}>
            <div className="space-y-2.5" role="radiogroup" aria-label="Phone use before sleep">
              {PHONE_USE.map((o) => (
                <OptionCard
                  key={o.id}
                  name="phoneBeforeBed"
                  checked={values.phoneBeforeBed === o.id}
                  onSelect={() => set("phoneBeforeBed", values.phoneBeforeBed === o.id ? null : o.id)}
                  title={o.label}
                />
              ))}
            </div>
            {values.phoneBeforeBed === "often" && (
              <p className="mt-4 animate-fade rounded-[14px] bg-amber-soft p-4 text-[13px] leading-relaxed text-amber">
                A gentle wind-down reminder can help — you&rsquo;ll find one in Settings → Sleep.
                (LIFEOS can&rsquo;t measure real screen time unless a supported integration is connected.)
              </p>
            )}
          </StepShell>
        )}
      </div>

      <FieldError>{error}</FieldError>

      {/* Controls */}
      <div className="mt-9 flex items-center justify-between">
        <button
          className="btn btn-ghost"
          onClick={back}
          disabled={pending || (step === 0 && phase === "questions")}
          style={{ visibility: step === 0 ? "hidden" : "visible" }}
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="flex items-center gap-2">
          {def.skippable && (
            <button className="btn btn-ghost" onClick={skip} disabled={pending}>
              Skip
            </button>
          )}
          <button className="btn btn-primary" onClick={next} disabled={pending}>
            {pending ? <Spinner size={15} /> : null}
            {isLast ? "Finish setup" : "Continue"}
            {!pending && <ArrowRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
