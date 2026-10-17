"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Storage, generateId, todayDate } from "@/lib/client/storage";
import { Spinner, Chip } from "@/components/ui/index";

type Step = "ageGroup" | "lifeStage" | "objectives" | "wakeTime" | "done";

const STEPS: Step[] = ["ageGroup", "lifeStage", "objectives", "wakeTime", "done"];

const AGE_GROUPS = [
  { id: "13_17", label: "13–17" },
  { id: "18_24", label: "18–24" },
  { id: "25_34", label: "25–34" },
  { id: "35_49", label: "35–49" },
  { id: "50_plus", label: "50+" },
];

const LIFE_STAGES = [
  { id: "school", label: "O'quvchi" },
  { id: "university", label: "Talaba" },
  { id: "employed", label: "Xodim" },
  { id: "entrepreneur", label: "Tadbirkor" },
  { id: "home_family", label: "Uy/Oila" },
  { id: "other", label: "Boshqa" },
];

const OBJECTIVES = [
  { id: "goals", label: "Maqsadlarga erishish" },
  { id: "sleep", label: "Uyqu rejimi" },
  { id: "habits", label: "Odatlar shakllantirish" },
  { id: "time", label: "Vaqtni boshqarish" },
  { id: "focus", label: "Diqqatni jamlash" },
  { id: "productivity", label: "Samaradorlik" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("ageGroup");
  const [loading, setLoading] = useState(false);

  // form values
  const [ageGroup, setAgeGroup] = useState("");
  const [lifeStage, setLifeStage] = useState("");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [bedtime, setBedtime] = useState("23:00");

  useEffect(() => {
    setMounted(true);
    const id = Storage.getCurrentProfileId();
    if (!id) { router.replace("/welcome"); return; }
    const profile = Storage.getProfile(id);
    if (!profile) { router.replace("/welcome"); return; }
    if (profile.onboardingCompleted) { router.replace("/today"); return; }
    setPid(id);
    const prefs = Storage.getPrefs(id);
    if (prefs.ageGroup) setAgeGroup(prefs.ageGroup);
    if (prefs.lifeStage) setLifeStage(prefs.lifeStage);
    if (prefs.objectives?.length) setObjectives(prefs.objectives);
    if (prefs.wakeTime) setWakeTime(prefs.wakeTime);
    if (prefs.bedtime) setBedtime(prefs.bedtime);
    if (prefs.onboardingStep) {
      const idx = Math.min(prefs.onboardingStep, STEPS.length - 1);
      setStep(STEPS[idx]);
    }
  }, [router]);

  const stepIdx = STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  function persist(nextStepIdx: number) {
    if (!pid) return;
    const prefs = Storage.getPrefs(pid);
    Storage.savePrefs({ ...prefs, ageGroup, lifeStage, objectives, wakeTime, bedtime, onboardingStep: nextStepIdx, updatedAt: new Date().toISOString() });
  }

  function advance() {
    const nextIdx = stepIdx + 1;
    persist(nextIdx);
    if (nextIdx >= STEPS.length) { finish(); return; }
    setStep(STEPS[nextIdx]);
  }

  function back() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  }

  function toggleObj(id: string) {
    setObjectives(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function finish() {
    if (!pid) return;
    setLoading(true);
    const prefs = Storage.getPrefs(pid);
    Storage.savePrefs({ ...prefs, ageGroup, lifeStage, objectives, wakeTime, bedtime, sleepTargetMinutes: 480, updatedAt: new Date().toISOString() });

    // Create a sample goal to demonstrate the lamp
    if (objectives.length > 0) {
      const goalTitle = objectives.includes("goals") ? "Birinchi maqsadimni bajarish" :
                        objectives.includes("sleep") ? "Muntazam uyqu rejimi" :
                        objectives.includes("habits") ? "Yangi odat shakllantirish" : "Bugungi vazifalarni bajarish";
      const gid = generateId();
      Storage.saveGoal({ id: gid, profileId: pid, title: goalTitle, description: null, category: "personal", targetDate: null, status: "active", metricTarget: null, metricUnit: null, metricProgress: 0, source: "lifeos", createdAt: new Date().toISOString() });

      // Create a welcome scheduled goal (lamp reminder for this evening)
      const tonight = new Date();
      tonight.setHours(20, 0, 0, 0);
      Storage.saveScheduledGoal({
        id: generateId(), profileId: pid, goalId: gid,
        scheduledAt: tonight.toISOString(),
        duration: 20, repeat: "once", repeatDays: [],
        state: "idle", snoozeUntil: null, completedAt: null, missedAt: null, note: null,
        createdAt: new Date().toISOString(),
      });
    }

    const profile = Storage.getProfile(pid)!;
    Storage.saveProfile({ ...profile, onboardingCompleted: true });
    router.replace("/today");
  }

  if (!mounted || !pid) return null;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "linear-gradient(160deg, #151B23 0%, #202833 55%, #2B3440 100%)" }}>
      {/* progress */}
      <div className="px-6 pt-12">
        <div className="flex items-center gap-3 mb-8">
          {stepIdx > 0 && step !== "done" && (
            <button onClick={back} className="w-9 h-9 rounded-full flex items-center justify-center text-[#ADA996]" style={{ background: "rgba(255,255,255,0.06)" }}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "#FF633C" }} />
          </div>
          <span className="text-small text-[#ADA996]">{stepIdx + 1}/{STEPS.length}</span>
        </div>
      </div>

      <div className="flex-1 px-6 max-w-sm mx-auto w-full">
        {step === "ageGroup" && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="text-h1 text-[#F2F2F2]">Yoshingiz?</h2>
            <p className="text-body text-[#ADA996]">Tavsiyalar yoshingizga moslashtiriladi.</p>
            <div className="grid grid-cols-2 gap-3">
              {AGE_GROUPS.map(a => (
                <button key={a.id} onClick={() => setAgeGroup(a.id)} className="p-4 rounded-2xl text-center font-semibold transition-all" style={{
                  background: ageGroup === a.id ? "#FF633C" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${ageGroup === a.id ? "#FF633C" : "rgba(255,255,255,0.1)"}`,
                  color: ageGroup === a.id ? "#fff" : "#ADA996",
                }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "lifeStage" && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="text-h1 text-[#F2F2F2]">Hayot holatingiz?</h2>
            <p className="text-body text-[#ADA996]">LifeOS sizning vaziyatingizga moslanadi.</p>
            <div className="space-y-2">
              {LIFE_STAGES.map(s => (
                <button key={s.id} onClick={() => setLifeStage(s.id)} className="w-full p-4 rounded-2xl text-left font-semibold transition-all flex items-center justify-between" style={{
                  background: lifeStage === s.id ? "rgba(255,99,60,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${lifeStage === s.id ? "#FF633C" : "rgba(255,255,255,0.08)"}`,
                  color: lifeStage === s.id ? "#FF633C" : "#ADA996",
                }}>
                  {s.label}
                  {lifeStage === s.id && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "objectives" && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="text-h1 text-[#F2F2F2]">Nimaga erishmoqchisiz?</h2>
            <p className="text-body text-[#ADA996]">Bir yoki bir nechtasini tanlang.</p>
            <div className="grid grid-cols-2 gap-2">
              {OBJECTIVES.map(o => (
                <button key={o.id} onClick={() => toggleObj(o.id)} className="p-3 rounded-2xl text-sm font-semibold transition-all text-center" style={{
                  background: objectives.includes(o.id) ? "rgba(255,99,60,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${objectives.includes(o.id) ? "#FF633C" : "rgba(255,255,255,0.08)"}`,
                  color: objectives.includes(o.id) ? "#FF633C" : "#ADA996",
                }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "wakeTime" && (
          <div className="space-y-6 animate-fade-up">
            <h2 className="text-h1 text-[#F2F2F2]">Uyqu rejimi</h2>
            <p className="text-body text-[#ADA996]">Lamp bu vaqtlarga qarab ishlaydi.</p>
            <div className="space-y-4">
              <div>
                <label className="text-small text-[#ADA996] mb-2 block" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Uyg&apos;onish vaqti</label>
                <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} className="w-full rounded-2xl px-4 py-3 text-[#F2F2F2] outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 20, fontWeight: 700 }} />
              </div>
              <div>
                <label className="text-small text-[#ADA996] mb-2 block" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Uyqu vaqti</label>
                <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className="w-full rounded-2xl px-4 py-3 text-[#F2F2F2] outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 20, fontWeight: 700 }} />
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-6 animate-fade-up text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(255,99,60,0.15)", border: "1px solid rgba(255,99,60,0.3)" }}>
              <Check size={36} style={{ color: "#FF633C" }} />
            </div>
            <h2 className="text-h1 text-[#F2F2F2]">Hammasi tayyor!</h2>
            <p className="text-body text-[#ADA996]">
              LifeOS sizning maqsadlaringizga moslashtirildi. Lamp birinchi maqsadingizni yoritishga tayyor.
            </p>
          </div>
        )}
      </div>

      {/* bottom button */}
      <div className="px-6 pb-10 pt-6 max-w-sm mx-auto w-full">
        <button
          onClick={advance}
          disabled={loading || (step === "ageGroup" && !ageGroup) || (step === "lifeStage" && !lifeStage)}
          className="w-full h-14 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-base transition-opacity disabled:opacity-40"
          style={{ background: "#FF633C", boxShadow: "0 4px 20px rgba(255,99,60,0.35)" }}
        >
          {loading ? <Spinner size={20} /> : step === "done" ? <>Boshlash <ArrowRight size={18} /></> : <>Keyingisi <ArrowRight size={18} /></>}
        </button>
        {step !== "done" && step !== "ageGroup" && (
          <button onClick={advance} className="w-full mt-3 text-center text-small text-[#ADA996] py-2">O&apos;tkazib yuborish</button>
        )}
      </div>
    </div>
  );
}
