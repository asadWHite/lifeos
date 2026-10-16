/**
 * Personalization engine — explicit, readable rules only.
 * Uzbek Edition.
 */

import { guidanceForAge, type AgeGroup } from "./sleep";
import {
  labelFor,
  AGE_GROUPS,
  DIFFICULTIES,
  INTERESTS,
  LIFE_STAGES,
  OBJECTIVES,
  PHONE_USE,
  PLANNING_STYLES,
} from "./onboarding";

export type PersonalizationInput = {
  ageGroup: string | null;
  lifeStage: string | null;
  interests: string[];
  objectives: string[];
  planningStyle: string | null;
  difficulties: string[];
  personalTime: string | null;
  sleepTargetMinutes: number | null;
};

export type StarterTask = {
  title: string;
  priority: "low" | "normal" | "high";
  durationMinutes: number | null;
};

export type DashboardConfig = {
  emphasizeSleep: boolean;
  emphasizeRoutines: boolean;
  insights: string[];
  quickPrompts: string[];
  starterTasks: StarterTask[];
  suggestedGoal: { title: string; description: string; category: string } | null;
};

const OBJECTIVE_STARTER_TASKS: Record<string, StarterTask> = {
  time_management: {
    title: "Ertangi kun uchun 3 ta asosiy ustuvorlikni tanlang",
    priority: "normal",
    durationMinutes: 10,
  },
  skills: {
    title: "Yangi ko'nikma ustida 25 daqiqa ishlang",
    priority: "normal",
    durationMinutes: 25,
  },
  academic: {
    title: "Dars qilish uchun 40 daqiqa vaqt ajrating",
    priority: "high",
    durationMinutes: 40,
  },
  professional: {
    title: "Professional rivojlanish uchun 30 daqiqa",
    priority: "normal",
    durationMinutes: 30,
  },
  projects: {
    title: "Shaxsiy loyiha ustida ishlang",
    priority: "normal",
    durationMinutes: 30,
  },
  sleep: {
    title: "Uxshashdan 30 daqiqa oldin tayyorgarlikni boshlang",
    priority: "normal",
    durationMinutes: 30,
  },
  activity: {
    title: "20 daqiqa jismoniy mashq qiling",
    priority: "normal",
    durationMinutes: 20,
  },
  routines: {
    title: "Ertalabki qisqa tartibni bajaring",
    priority: "normal",
    durationMinutes: 15,
  },
  responsibilities: {
    title: "Bugungi eng muhim 3 ta vazifani belgilang",
    priority: "normal",
    durationMinutes: 5,
  },
};

const OBJECTIVE_GOALS: Record<string, { title: string; description: string; category: string }> = {
  sleep: {
    title: "Muntazam uyqu tartibini shakllantirish",
    description: "Har kuni bir vaqtda uxlash va uyg'onish orqali sifatli uyquga erishish.",
    category: "health",
  },
  skills: {
    title: "Yangi ko'nikmani o'rganish",
    description: "Kichik qadamlar bilan yangi narsa o'rganish va taraqqiyotni kuzatish.",
    category: "learning",
  },
  academic: {
    title: "Akademik natijalarni yaxshilash",
    description: "Doimiy dars qilish rejasini tuzish va unga amal qilish.",
    category: "learning",
  },
  professional: {
    title: "Professional o'sish",
    description: "Kasbiy mahoratni oshirish uchun maxsus vaqt ajratish.",
    category: "career",
  },
  projects: {
    title: "Shaxsiy loyihani yakunlash",
    description: "Loyiha bosqichlarini belgilash va yakuniy natijaga erishish.",
    category: "creative",
  },
  activity: {
    title: "Faol hayot tarzi",
    description: "Har kuni ko'proq harakat qilish va sport bilan shug'ullanish.",
    category: "health",
  },
  time_management: {
    title: "Vaqtni to'g'ri boshqarish",
    description: "Kunlik reja asosida eng muhim vazifalarga e'tibor qaratish.",
    category: "personal",
  },
  routines: {
    title: "Kunlik tartib (Routine)",
    description: "Foydali odatlarni kunlik rejimga mustahkam bog'lash.",
    category: "personal",
  },
  responsibilities: {
    title: "Mas'uliyatli yondashuv",
    description: "Kundalik majburiyatlarni o'z vaqtida va sifatli bajarish.",
    category: "personal",
  },
};

function planSize(planningStyle: string | null): number {
  if (planningStyle === "independent") return 1;
  if (planningStyle === "full_plan") return 3;
  return 2;
}

export function personalize(input: PersonalizationInput): DashboardConfig {
  const insights: string[] = [];
  const starterTasks: StarterTask[] = [];
  const quickPrompts: string[] = ["Kunlik reja tuzish", "Uyqu tahlili", "Maqsadlarim"];

  const objectives = input.objectives.filter((o) => o !== "other");

  for (const objective of objectives.slice(0, planSize(input.planningStyle))) {
    const task = OBJECTIVE_STARTER_TASKS[objective];
    if (task) starterTasks.push({ ...task });
  }
  
  if (starterTasks.length === 0) {
    starterTasks.push({
      title: "Bugun nima qilish kerakligini belgilab oling",
      priority: "normal",
      durationMinutes: 5,
    });
  }

  if (input.planningStyle === "independent") {
    insights.push("Siz mustaqil rejalashtirishni yoqtirasiz, shuning uchun LifeOS faqat muhim tavsiyalar bilan cheklanadi.");
  } else if (input.planningStyle === "full_plan") {
    insights.push("LifeOS sizga to'liq kunlik reja taklif qiladi — uni o'zingizga moslab o'zgartirishingiz mumkin.");
  } else {
    insights.push("LifeOS sizga kunning asosiy vazifalarini shakllantirishda yordam beradi.");
  }

  const wantsSleep = input.objectives.includes("sleep");
  const guidance = guidanceForAge((input.ageGroup as AgeGroup) ?? null);
  if (wantsSleep) {
    insights.push(`Siz uchun uyqu muhim, shuning uchun uyqu nazorati dashboard markazida bo'ladi. Sizning yoshingiz uchun tavsiya: ${guidance.label}.`);
  }

  let suggestedGoal: DashboardConfig["suggestedGoal"] = null;
  for (const objective of objectives) {
    if (OBJECTIVE_GOALS[objective]) {
      suggestedGoal = { ...OBJECTIVE_GOALS[objective] };
      insights.push(`Maqsadlaringiz asosida "${suggestedGoal.title}" boshlang'ich maqsadi yaratildi.`);
      break;
    }
  }

  if (input.lifeStage === "school" || input.lifeStage === "university") {
    quickPrompts.push("Dars jadvalini shakllantirish");
  }

  return {
    emphasizeSleep: wantsSleep,
    emphasizeRoutines: input.objectives.includes("routines") || input.difficulties.includes("routines"),
    insights,
    quickPrompts: quickPrompts.slice(0, 4),
    starterTasks,
    suggestedGoal,
  };
}

export type MemoryInput = {
  ageGroup: string | null;
  lifeStage: string | null;
  lifeStageOther: string | null;
  interests: string[];
  interestsOther: string | null;
  objectives: string[];
  objectivesOther: string | null;
  wakeTime: string | null;
  bedtime: string | null;
  planningStyle: string | null;
  difficulties: string[];
  phoneBeforeBed: string | null;
  weekendVaries: boolean | null;
};

export function memoryFacts(input: MemoryInput): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: string | null) => { if (value) facts.push({ label, value }); };

  push("YOSH GURUHI", labelFor(AGE_GROUPS, input.ageGroup));
  push("HAYOT TARZI", labelFor(LIFE_STAGES, input.lifeStage));
  
  const interests = input.interests
    .map((i) => (i === "other" ? input.interestsOther?.trim() || null : labelFor(INTERESTS, i)))
    .filter(Boolean) as string[];
  push("QIZIQISHLAR", interests.length ? interests.join(", ") : null);
  
  const objectives = input.objectives
    .map((i) => (i === "other" ? input.objectivesOther?.trim() || null : labelFor(OBJECTIVES, i)))
    .filter(Boolean) as string[];
  push("MAQSADLAR", objectives.length ? objectives.join(", ") : null);
  
  push("REJALASHTIRISH", labelFor(PLANNING_STYLES, input.planningStyle));
  if (input.wakeTime) push("UYG'ONISH", input.wakeTime);
  if (input.bedtime) push("UXSHASH", input.bedtime);
  
  const difficulties = input.difficulties
    .filter((d) => d !== "none")
    .map((d) => labelFor(DIFFICULTIES, d))
    .filter(Boolean) as string[];
  push("QIYINCHILIKLAR", difficulties.length ? difficulties.join(", ") : null);
  
  push("TELEFON", labelFor(PHONE_USE, input.phoneBeforeBed));
  
  return facts;
}
