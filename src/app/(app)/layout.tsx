"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Storage } from "@/lib/client/storage";
import { AppShell } from "@/components/shell/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid || !Storage.getProfile(pid)) { router.replace("/welcome"); return; }
    const profile = Storage.getProfile(pid)!;
    if (!profile.onboardingCompleted) { router.replace("/onboarding"); return; }
  }, [router]);

  return <AppShell>{children}</AppShell>;
}
