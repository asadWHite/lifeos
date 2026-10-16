"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ShieldAlert, Sparkles, Bell, Sun, Moon, Laptop } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

type Phase = "questions" | "gate" | "summary";

function OptionCard({
  name,
  checked,
  onSelect,
  title,
  description,
  icon: Icon
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: any;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
        checked
          ? "border-brand-silver bg-brand-silver/10 shadow-metallic"
          : "border-white/5 bg-white/5 hover:bg-white/10"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${checked ? 'bg-brand-silver text-brand-dark' : 'bg-white/10 text-brand-silver'}`}>
            <Icon size={20} />
          </div>
        )}
        <div className="flex-1">
          <span className={`block text-sm font-semibold ${checked ? "text-brand-light" : "text-brand-silver"}`}>
            {title}
          </span>
          {description && (
            <span className="mt-0.5 block text-xs text-brand-silver/60 leading-relaxed">{description}</span>
          )}
        </div>
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${checked ? 'bg-brand-silver border-brand-silver' : 'border-white/20'}`}>
          {checked && <Check size={12} strokeWidth={4} className="text-brand-dark" />}
        </div>
      </div>
    </label>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-full">
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-brand-light tracking-tight">{title}</h1>
        <p className="mt-2 text-brand-silver/70 text-sm leading-relaxed">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </motion.div>
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
  const totalSteps = STEPS.length;
  const isLast = step === totalSteps - 1;

  function set<K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }

  const persist = (stepIndex: number) => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) return;
    const current = Storage.getPrefs(pid);
    Storage.savePrefs({ 
      ...current, 
      ...values, 
      profileId: pid,
      onboardingStep: stepIndex + 1,
      updatedAt: new Date()
    });
  };

  const next = () => {
    const err = validateStep(step, values);
    if (err) { setError(err); return; }
    if (def.id === "age" && values.ageGroup === "u13") { setPhase("gate"); return; }
    if (isLast) { finish(); return; }
    persist(step);
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const back = () => {
    setError("");
    if (phase === "gate") { setPhase("questions"); return; }
    if (step > 0) setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const plan = useMemo(() => personalize({ ...values, sleepTargetMinutes: null }), [values]);

  const finish = () => {
    start(() => {
      const pid = Storage.getCurrentProfileId();
      if (!pid) return;
      const p = Storage.getProfile(pid);
      if (!p) return;

      const target = guidanceForAge((values.ageGroup as AgeGroup) ?? null).recommendedMinutes;
      const today = todayInTz(p.timezone);

      Storage.savePrefs({ 
        ...Storage.getPrefs(pid),
        ...values, 
        profileId: pid,
        sleepTargetMinutes: target, 
        onboardingStep: 0,
        updatedAt: new Date()
      });
      
      // Cleanup lifeos starter tasks
      Storage.getTasks().filter(t => t.profileId === pid && t.source === "lifeos").forEach(t => Storage.deleteTask(t.id));

      plan.starterTasks.forEach(t => {
        Storage.saveTask({
          id: generateId(), profileId: pid, title: t.title, priority: t.priority,
          durationMinutes: t.durationMinutes ?? null, dueDate: today, source: "lifeos",
          notes: null, status: "todo", goalId: null, completedAt: null, createdAt: new Date()
        });
      });

      if (plan.suggestedGoal) {
        Storage.saveGoal({
          id: generateId(), profileId: pid, title: plan.suggestedGoal.title,
          description: plan.suggestedGoal.description, category: plan.suggestedGoal.category,
          source: "lifeos", status: "active", metricProgress: 0, metricTarget: null, 
          metricUnit: null, targetDate: null, createdAt: new Date()
        });
      }

      Storage.saveProfile({ ...p, onboardingCompleted: true });
      setPhase("summary");
    });
  };

  if (phase === "gate") {
    return (
      <div className="w-full max-w-xl p-4">
        <div className="metallic-card bg-brand-dark p-8 border-brand-silver/20">
          <div className="w-14 h-14 rounded-2xl bg-brand-silver/10 flex items-center justify-center text-brand-silver mb-6">
            <ShieldAlert size={30} />
          </div>
          <h1 className="text-2xl font-bold text-brand-light">Yosh chegarasi</h1>
          <p className="mt-4 text-brand-silver/80 leading-relaxed text-sm">
            LifeOS tizimidan foydalanish uchun foydalanuvchi kamida 13 yoshda bo'lishi kerak. 
            Bu xavfsizlik va shaxsiy ma'lumotlarni himoya qilish talablariga mos keladi.
          </p>
          <button className="btn-primary w-full mt-8" onClick={back}>
            <ArrowLeft size={18} className="mr-2" /> Orqaga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div className="w-full max-w-xl p-4 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="w-20 h-20 rounded-[28px] bg-brand-silver/10 flex items-center justify-center text-brand-silver mx-auto mb-8 shadow-metallic">
            <Sparkles size={40} />
          </div>
          <h1 className="text-3xl font-bold text-brand-light mb-4">Tayyor, {profileName}!</h1>
          <p className="text-brand-silver/70 mb-10 leading-relaxed">
            Sizning javoblaringiz asosida LifeOS shaxsiy dashboardingizni shakllantirdi.
          </p>
          
          <div className="metallic-card bg-brand-dark p-6 border-brand-silver/20 text-left mb-10">
            <h2 className="text-brand-light font-bold mb-4 flex items-center gap-2">
              <Check size={18} className="text-brand-silver" strokeWidth={3} />
              Nimalar o'zgardi?
            </h2>
            <ul className="space-y-3">
              {plan.insights.map((insight, i) => (
                <li key={i} className="text-xs text-brand-silver/80 flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-brand-silver mt-1.5 shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          <button className="btn-primary w-full h-14 text-lg" onClick={() => router.push("/home")}>
            Dashboardni ochish
            <ArrowRight size={20} className="ml-2" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl p-4 flex flex-col h-full">
      {/* Header / Progress */}
      <div className="mb-10">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-bold text-brand-silver/50 uppercase tracking-widest">Onboarding</span>
          <span className="text-xs font-bold text-brand-silver uppercase">{step + 1} / {totalSteps}</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-brand-silver"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <StepShell key={step} title={def.title} subtitle={def.subtitle}>
          <div className="space-y-3">
            {def.id === "age" && (
              <div className="grid grid-cols-1 gap-3">
                {AGE_GROUPS.map(o => (
                  <OptionCard key={o.id} name="age" checked={values.ageGroup === o.id} onSelect={() => set("ageGroup", o.id)} title={o.label} />
                ))}
              </div>
            )}

            {def.id === "stage" && (
              <div className="space-y-3">
                {LIFE_STAGES.map(o => (
                  <OptionCard key={o.id} name="stage" checked={values.lifeStage === o.id} onSelect={() => set("lifeStage", o.id)} title={o.label} />
                ))}
              </div>
            )}

            {def.id === "interests" && (
              <div className="grid grid-cols-2 gap-2">
                {INTERESTS.map(o => (
                  <button 
                    key={o.id}
                    onClick={() => set("interests", toggleMulti(values.interests, o.id))}
                    className={`p-3 rounded-2xl border text-xs font-medium transition-all ${
                      values.interests.includes(o.id) 
                      ? 'bg-brand-silver border-brand-silver text-brand-dark shadow-metallic' 
                      : 'bg-white/5 border-white/5 text-brand-silver'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {def.id === "objectives" && (
              <div className="grid grid-cols-1 gap-3">
                {OBJECTIVES.map(o => (
                  <OptionCard key={o.id} name="objective" checked={values.objectives.includes(o.id)} onSelect={() => set("objectives", toggleMulti(values.objectives, o.id))} title={o.label} />
                ))}
              </div>
            )}

            {def.id === "schedule" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-brand-silver uppercase tracking-widest px-1">Uyg'onish vaqti</label>
                    <input type="time" value={values.wakeTime || ""} onChange={e => set("wakeTime", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-brand-light focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-brand-silver uppercase tracking-widest px-1">Uxshash vaqti</label>
                    <input type="time" value={values.bedtime || ""} onChange={e => set("bedtime", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-brand-light focus:outline-none" />
                  </div>
                </div>
                <div className="metallic-card bg-brand-dark/50 p-5 border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-semibold text-brand-light">Dam olish kunlari</p>
                      <p className="text-[10px] text-brand-silver/50 uppercase tracking-widest mt-1">Rejim o'zgaradimi?</p>
                    </div>
                    <Toggle label="Varies" checked={values.weekendVaries || false} onChange={v => set("weekendVaries", v)} />
                  </div>
                </div>
              </div>
            )}

            {def.id === "planning" && (
              <div className="space-y-3">
                {PLANNING_STYLES.map(o => (
                  <OptionCard key={o.id} name="planning" checked={values.planningStyle === o.id} onSelect={() => set("planningStyle", o.id)} title={o.label} description={o.description} />
                ))}
              </div>
            )}

            {def.id === "difficulties" && (
              <div className="grid grid-cols-1 gap-3">
                {DIFFICULTIES.map(o => (
                  <OptionCard key={o.id} name="diff" checked={values.difficulties.includes(o.id)} onSelect={() => set("difficulties", toggleDifficulty(values.difficulties, o.id))} title={o.label} />
                ))}
              </div>
            )}

            {def.id === "phone" && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-brand-silver uppercase tracking-widest mb-2 px-1">Uxshashdan oldin telefondan foydalanish</p>
                {PHONE_USE.map(o => (
                  <OptionCard key={o.id} name="phone" checked={values.phoneBeforeBed === o.id} onSelect={() => set("phoneBeforeBed", o.id)} title={o.label} />
                ))}
              </div>
            )}

            {def.id === "reminders" && (
              <div className="metallic-card bg-brand-dark/50 p-6 border-brand-silver/10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-brand-silver/10 flex items-center justify-center text-brand-silver">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h3 className="text-brand-light font-bold">Telegram bildirishnomalari</h3>
                    <p className="text-xs text-brand-silver/60">Sizga o'z vaqtida eslatib turamiz</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <span className="text-sm font-medium text-brand-silver">Eslatmalar yoqilsinmi?</span>
                  <Toggle label="Reminders" checked={values.reminderEnabled} onChange={v => set("reminderEnabled", v)} />
                </div>
              </div>
            )}

            {def.id === "appearance" && (
              <div className="grid grid-cols-1 gap-3">
                <OptionCard icon={Moon} name="theme" checked={values.theme === 'dark'} onSelect={() => set("theme", 'dark')} title="To'q rejim (Dark)" description="Tungi vaqtda ko'zga qulay" />
                <OptionCard icon={Sun} name="theme" checked={values.theme === 'light'} onSelect={() => set("theme", 'light')} title="Yorug' rejim (Light)" description="Kunduzgi yorug'likda aniq" />
                <OptionCard icon={Laptop} name="theme" checked={values.theme === 'system'} onSelect={() => set("theme", 'system')} title="Tizimga moslashish" description="Qurilma sozlamalariga qarab" />
              </div>
            )}
          </div>
        </StepShell>
      </AnimatePresence>

      <div className="mt-auto pt-10 flex gap-3">
        {step > 0 && (
          <button className="h-14 px-6 rounded-2xl bg-white/5 text-brand-silver hover:bg-white/10 transition-all font-bold flex items-center justify-center" onClick={back}>
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 flex gap-3">
          {def.skippable && (
            <button className="flex-1 h-14 rounded-2xl bg-white/5 text-brand-silver/50 font-bold hover:text-brand-silver" onClick={() => setStep(step + 1)}>
              O'tkazib yuborish
            </button>
          )}
          <button className="flex-[2] btn-primary h-14 text-lg font-bold" onClick={next} disabled={pending}>
            {pending ? <Spinner size={20} /> : (isLast ? "Tamomlash" : "Keyingisi")}
            {!pending && <ArrowRight size={20} className="ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
}
