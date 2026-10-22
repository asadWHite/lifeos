import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const metadata: Metadata = { title: "Onboarding · Preview" };

export default function PreviewOnboardingPage() {
  return (
    <OnboardingWizard
      initialStep={0}
      initial={{
        name: "Asadbek",
        nickname: "",
        dob: "",
        timezone: "Asia/Tashkent",
        lifeSituation: null,
        responsibilities: [],
        interests: [],
        goalNotes: "",
        wakeTime: "",
        bedTime: "",
        commitment: "",
        focusTime: "",
        phoneBeforeBed: "",
        phoneAfterWake: "",
        habitFocus: [],
        reminderStyle: "gentle",
        planningStyle: "balanced",
      }}
    />
  );
}
