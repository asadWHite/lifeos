export type ProfileRow = {
  id: string;
  name: string;
  timezone: string;
  onboardingCompleted: boolean;
  createdAt: Date;
};

export type PreferencesRow = {
  profileId: string;
  ageGroup: string | null;
  lifeStage: string | null;
  lifeStageOther: string | null;
  interests: string[];
  interestsOther: string | null;
  objectives: string[];
  objectivesOther: string | null;
  wakeTime: string | null;
  bedtime: string | null;
  commitments: string | null;
  personalTime: string | null;
  weekendVaries: boolean | null;
  planningStyle: string | null;
  difficulties: string[];
  phoneBeforeBed: string | null;
  sleepTargetMinutes: number | null;
  hiddenSections: string[];
  theme: string;
  onboardingStep: number;
  updatedAt: Date;
};

export type GoalRow = {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  category: string;
  targetDate: string | null;
  status: string;
  metricTarget: number | null;
  metricUnit: string | null;
  metricProgress: number;
  source: string;
  createdAt: Date;
};

export type TaskRow = {
  id: string;
  profileId: string;
  goalId: string | null;
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: string;
  durationMinutes: number | null;
  status: string;
  source: string;
  completedAt: Date | null;
  createdAt: Date;
};

export type SleepSessionRow = {
  id: string;
  profileId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  manual: boolean;
  createdAt: Date;
};

export type CheckinRow = {
  id: string;
  profileId: string;
  day: string;
  energy: string | null;
  activityMinutes: number | null;
  note: string | null;
  createdAt: Date;
};

export type AssistantMessageRow = {
  id: string;
  profileId: string;
  role: "user" | "assistant";
  content: string;
  origin: "ai" | "rules";
  createdAt: Date;
};
