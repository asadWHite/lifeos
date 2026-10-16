/**
 * Onboarding definition: steps, options, and validation.
 * Kept separate from UI so the contract can be shared with future clients.
 *
 * Privacy principle: only ask what is needed to personalize. These answers
 * are preferences, never diagnoses or psychological profiles.
 */

import { isValidTime } from "./time";

export const AGE_GROUPS = [
  { id: "u13", label: "13 yoshdan kichik" },
  { id: "a13_17", label: "13–17 yosh" },
  { id: "a18_24", label: "18–24 yosh" },
  { id: "a25_34", label: "25–34 yosh" },
  { id: "a35_49", label: "35–49 yosh" },
  { id: "a50_64", label: "50–64 yosh" },
  { id: "a65p", label: "65 yoshdan katta" },
] as const;

export const LIFE_STAGES = [
  { id: "school", label: "Maktab o'quvchisi" },
  { id: "university", label: "Talaba (Universitet/Kollej)" },
  { id: "employed", label: "Ishchi (Xodim)" },
  { id: "entrepreneur", label: "Tadbirkor / Biznes egasi" },
  { id: "job_seeking", label: "Ish qidirmoqda" },
  { id: "home_family", label: "Uy / Oila bilan band" },
  { id: "retired", label: "Nafaqada" },
  { id: "other", label: "Boshqa" },
] as const;

export const INTERESTS = [
  { id: "learning", label: "Ta'lim va o'rganish" },
  { id: "technology", label: "Texnologiya va dasturlash" },
  { id: "business", label: "Biznes va moliya" },
  { id: "fitness", label: "Fitnes va sport" },
  { id: "creativity", label: "Kreativlik va dizayn" },
  { id: "travel", label: "Sayohat" },
  { id: "growth", label: "Shaxsiy rivojlanish" },
  { id: "family", label: "Oila va do'stlar" },
  { id: "entertainment", label: "O'yinlar va ko'ngilochar" },
  { id: "wellbeing", label: "Sog'lom turmush tarzi" },
  { id: "other", label: "Boshqa" },
] as const;

export const OBJECTIVES = [
  { id: "time_management", label: "Vaqtni to'g'ri boshqarish" },
  { id: "skills", label: "Yangi ko'nikmalar o'rganish" },
  { id: "academic", label: "O'qishdagi natijalarni yaxshilash" },
  { id: "professional", label: "Professional o'sish" },
  { id: "projects", label: "Shaxsiy loyihalar ustida ishlash" },
  { id: "sleep", label: "Uyqu tartibini yaxshilash" },
  { id: "activity", label: "Jismoniy faollikni oshirish" },
  { id: "routines", label: "Kunlik tartibni (routine) shakllantirish" },
  { id: "responsibilities", label: "Kundalik vazifalarni nazorat qilish" },
  { id: "other", label: "Boshqa" },
] as const;

export const PLANNING_STYLES = [
  {
    id: "full_plan",
    label: "To'liq reja taklifi",
    description: "LifeOS sizga tayyor reja beradi, siz uni o'zgartirasiz.",
  },
  {
    id: "together",
    label: "Birgalikda rejalashtirish",
    description: "Siz reja tuzasiz, LifeOS unga qo'shimchalar kiritadi.",
  },
  {
    id: "independent",
    label: "Mustaqil rejalashtirish",
    description: "Siz o'zingiz reja tuzasiz, LifeOS faqat eslatib turadi.",
  },
] as const;

export const DIFFICULTIES = [
  { id: "starting", label: "Ishni boshlash (motivation)" },
  { id: "focus", label: "Diqqatni jamlash (focus)" },
  { id: "finishing", label: "Ishni oxiriga yetkazish" },
  { id: "time", label: "Vaqtni taqsimlash" },
  { id: "routines", label: "Tartibga amal qilish" },
  { id: "balance", label: "Hayot va ish balansi" },
  { id: "none", label: "Hech qanday qiyinchilik yo'q" },
  { id: "other", label: "Boshqa" },
] as const;

export const PHONE_USE = [
  { id: "rarely", label: "Juda kam yoki yo'q" },
  { id: "sometimes", label: "Ba'zida (10-15 daqiqa)" },
  { id: "often", label: "Tez-tez (30+ daqiqa)" },
  { id: "prefer_not", label: "Aytmaslikni afzal ko'raman" },
] as const;

export const COMMITMENTS = [
  { id: "school", label: "School takes most weekdays" },
  { id: "work", label: "Work takes most weekdays" },
  { id: "mixed", label: "A mix that varies week to week" },
  { id: "flexible", label: "My days are mostly flexible" },
] as const;

export const PERSONAL_TIME = [
  { id: "morning", label: "Mornings" },
  { id: "afternoon", label: "Afternoons" },
  { id: "evening", label: "Evenings" },
  { id: "varies", label: "It varies" },
] as const;

export type OptionSet<T extends ReadonlyArray<{ id: string; label: string }>> =
  T[number]["id"];

export type AgeGroupId = OptionSet<typeof AGE_GROUPS>;
export type LifeStageId = OptionSet<typeof LIFE_STAGES>;
export type PlanningStyleId = OptionSet<typeof PLANNING_STYLES>;

export type OnboardingValues = {
  ageGroup: string | null;
  lifeStage: string | null;
  lifeStageOther: string;
  interests: string[];
  interestsOther: string;
  objectives: string[];
  objectivesOther: string;
  wakeTime: string | null;
  bedtime: string | null;
  commitments: string | null;
  personalTime: string | null;
  weekendVaries: boolean | null;
  planningStyle: string | null;
  difficulties: string[];
  phoneBeforeBed: string | null;
  reminderEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
};

export const EMPTY_VALUES: OnboardingValues = {
  ageGroup: null,
  lifeStage: null,
  lifeStageOther: "",
  interests: [],
  interestsOther: "",
  objectives: [],
  objectivesOther: "",
  wakeTime: null,
  bedtime: null,
  commitments: null,
  personalTime: null,
  weekendVaries: null,
  planningStyle: null,
  difficulties: [],
  phoneBeforeBed: null,
  reminderEnabled: true,
  theme: 'system',
};

export type StepId =
  | "age"
  | "stage"
  | "interests"
  | "objectives"
  | "schedule"
  | "planning"
  | "difficulties"
  | "phone"
  | "reminders"
  | "appearance";

export const STEPS: Array<{ id: StepId; skippable: boolean; title: string; subtitle: string }> = [
  { id: "age", skippable: false, title: "Yoshingiz nechada?", subtitle: "Bu uyqu va faoliyat tavsiyalarini to'g'ri shakllantirishga yordam beradi." },
  { id: "stage", skippable: false, title: "Hozirgi hayot tarzingiz qanday?", subtitle: "LifeOS sizning bandligingizga moslashadi." },
  { id: "interests", skippable: true, title: "Sizni nimalar qiziqtiradi?", subtitle: "Qiziqishlaringizga qarab yangi foydali odatlar taklif qilinadi." },
  { id: "objectives", skippable: true, title: "Asosiy maqsadlaringiz qanday?", subtitle: "LifeOS sizga aynan shu yo'nalishlarda yordam beradi." },
  { id: "schedule", skippable: true, title: "Kunlik tartibingiz qanday?", subtitle: "Taxminiy vaqtlar ham bo'laveradi, keyinroq o'zgartirish mumkin." },
  { id: "planning", skippable: true, title: "Rejalashtirishda qanday yordam kerak?", subtitle: "Tizim qanchalik faol yordam berishini tanlang." },
  { id: "difficulties", skippable: true, title: "Qayerda ko'proq qiynalasiz?", subtitle: "Sizga aynan shu masalalarda yechimlar taklif etiladi." },
  { id: "phone", skippable: true, title: "Uyqudan oldin telefondan foydalanasizmi?", subtitle: "Bu uyqu sifatini yaxshilash uchun kerak." },
  { id: "reminders", skippable: true, title: "Eslatmalar qabul qilasizmi?", subtitle: "Telegram orqali vaqtida xabardor qilamiz." },
  { id: "appearance", skippable: true, title: "Ilova ko'rinishi qanday bo'lsin?", subtitle: "O'zingizga qulay rejimni tanlang." },
];

export const TOTAL_QUESTION_STEPS = STEPS.length;

/** Validate a step. Returns an error string, or null when acceptable. */
export function validateStep(step: number, values: OnboardingValues): string | null {
  const def = STEPS[step];
  if (!def) return null;
  switch (def.id) {
    case "age":
      if (!values.ageGroup) return "Please choose your age group to continue.";
      break;
    case "stage": {
      if (!values.lifeStage) return "Please choose the option that fits you best.";
      if (values.lifeStage === "other" && values.lifeStageOther.trim().length > 120)
        return "Please keep the description under 120 characters.";
      break;
    }
    case "schedule": {
      if (values.wakeTime && !isValidTime(values.wakeTime)) return "Wake-up time looks invalid.";
      if (values.bedtime && !isValidTime(values.bedtime)) return "Bedtime looks invalid.";
      break;
    }
    default:
      break;
  }
  return null;
}

/** "None of these" is exclusive inside the difficulties multi-select. */
export function toggleDifficulty(current: string[], id: string): string[] {
  if (id === "none") return current.includes("none") ? [] : ["none"];
  const without = current.filter((d) => d !== "none");
  return without.includes(id) ? without.filter((d) => d !== id) : [...without, id];
}

export function toggleMulti(current: string[], id: string): string[] {
  return current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
}

export function labelFor(
  set: ReadonlyArray<{ id: string; label: string }>,
  id: string | null,
): string | null {
  if (!id) return null;
  return set.find((o) => o.id === id)?.label ?? null;
}
