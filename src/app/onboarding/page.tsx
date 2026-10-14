import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { OnboardingValues } from "@/lib/onboarding";
import { Logo, Wordmark } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.profile.onboardingCompleted) redirect("/home");

  const p = session.prefs;
  const initialValues: OnboardingValues = {
    ageGroup: p.ageGroup,
    lifeStage: p.lifeStage,
    lifeStageOther: p.lifeStageOther ?? "",
    interests: p.interests ?? [],
    interestsOther: p.interestsOther ?? "",
    objectives: p.objectives ?? [],
    objectivesOther: p.objectivesOther ?? "",
    wakeTime: p.wakeTime,
    bedtime: p.bedtime,
    commitments: p.commitments,
    personalTime: p.personalTime,
    weekendVaries: p.weekendVaries,
    planningStyle: p.planningStyle,
    difficulties: p.difficulties ?? [],
    phoneBeforeBed: p.phoneBeforeBed,
  };
  const initialStep = Math.min(Math.max(p.onboardingStep ?? 0, 0), 7);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2.5">
          <Logo size={26} />
          <Wordmark size={15} />
        </div>
        <span className="text-[12.5px] font-medium text-ink3">Setting up for {session.profile.name.split(" ")[0]}</span>
      </header>
      <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-8 sm:pt-12">
        <OnboardingWizard initialStep={initialStep} initialValues={initialValues} profileName={session.profile.name.split(" ")[0]} />
      </div>
    </div>
  );
}
