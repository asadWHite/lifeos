import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingCompleted) redirect("/onboarding");

  return (
    <AppShell
      user={{
        name: user.name,
        nickname: user.nickname,
        timezone: user.timezone,
        remindersEnabled: user.remindersEnabled,
        reminderStyle: user.reminderStyle,
      }}
    >
      {children}
    </AppShell>
  );
}
