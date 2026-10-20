import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const metadata: Metadata = { title: "Welcome to LifeOS" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.onboardingCompleted) redirect("/today");

  return (
    <OnboardingWizard
      initialStep={Math.min(Math.max(user.onboardingStep, 0), 8)}
      initial={{
        name: user.name,
        nickname: user.nickname ?? "",
        dob: user.dob ?? "",
        timezone: user.timezone,
        lifeSituation: user.lifeSituation ?? null,
        responsibilities: user.responsibilities,
        interests: user.interests,
        goalNotes: user.goalNotes,
        wakeTime: user.schedule?.wakeTime ?? "",
        bedTime: user.schedule?.bedTime ?? "",
        commitment: user.schedule?.commitment ?? "",
        focusTime: user.schedule?.focusTime ?? "",
        phoneBeforeBed: user.phoneHabits?.beforeBed ?? "",
        phoneAfterWake: user.phoneHabits?.afterWake ?? "",
        habitFocus: user.habitFocus,
        reminderStyle: user.reminderStyle,
        planningStyle: user.planningStyle,
      }}
    />
  );
}
