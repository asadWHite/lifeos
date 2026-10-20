import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ProfileModule } from "@/components/profile-module";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <ProfileModule
      user={{
        email: user.email,
        name: user.name,
        nickname: user.nickname ?? "",
        dob: user.dob ?? "",
        timezone: user.timezone,
        theme: user.theme,
        image: user.image,
        viaGoogle: !!user.googleSub,
        createdAt: user.createdAt.toISOString(),
        remindersEnabled: user.remindersEnabled,
        reminderStyle: user.reminderStyle,
        planningStyle: user.planningStyle,
        lifeSituation: user.lifeSituation,
        responsibilities: user.responsibilities,
        interests: user.interests,
        habitFocus: user.habitFocus,
        wakeTime: user.schedule?.wakeTime ?? "",
        bedTime: user.schedule?.bedTime ?? "",
        phoneBeforeBed: user.phoneHabits?.beforeBed ?? "",
        phoneAfterWake: user.phoneHabits?.afterWake ?? "",
      }}
    />
  );
}
