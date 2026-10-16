"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/client/storage";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { OnboardingValues } from "@/lib/onboarding";
import { Logo } from "@/components/Branding";

export default function OnboardingPage() {
  const router = useRouter();
  const { mounted, profileId, Storage } = useStore();
  const [profile, setProfile] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(null);

  useEffect(() => {
    if (!mounted) return;
    if (!profileId) { router.push("/welcome"); return; }
    
    const p = Storage.getProfile(profileId);
    if (!p) { router.push("/welcome"); return; }
    if (p.onboardingCompleted) { router.push("/home"); return; }
    
    setProfile(p);
    setPrefs(Storage.getPrefs(profileId));
  }, [mounted, profileId, router, Storage]);

  if (!profile || !prefs) return null;

  const initialValues: OnboardingValues = {
    ageGroup: prefs.ageGroup,
    lifeStage: prefs.lifeStage,
    lifeStageOther: prefs.lifeStageOther ?? "",
    interests: prefs.interests ?? [],
    interestsOther: prefs.interestsOther ?? "",
    objectives: prefs.objectives ?? [],
    objectivesOther: prefs.objectivesOther ?? "",
    wakeTime: prefs.wakeTime,
    bedtime: prefs.bedtime,
    commitments: prefs.commitments,
    personalTime: prefs.personalTime,
    weekendVaries: prefs.weekendVaries,
    planningStyle: prefs.planningStyle,
    difficulties: prefs.difficulties ?? [],
    phoneBeforeBed: prefs.phoneBeforeBed,
    reminderEnabled: prefs.reminderEnabled ?? true,
    theme: (prefs.theme as any) || 'system',
  };
  const initialStep = Math.min(Math.max(prefs.onboardingStep ?? 0, 0), 7);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-lg font-black text-brand-dark tracking-tighter uppercase italic">LifeOS</span>
        </div>
        <span className="text-[12.5px] font-medium text-ink3">Setting up for {profile.name.split(" ")[0]}</span>
      </header>
      <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-8 sm:pt-12">
        <OnboardingWizard initialStep={initialStep} initialValues={initialValues} profileName={profile.name.split(" ")[0]} />
      </div>
    </div>
  );
}
