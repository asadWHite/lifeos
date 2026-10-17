"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Storage } from "@/lib/client/storage";
import { AppShell } from "@/components/shell/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
    const pid = Storage.getCurrentProfileId();
    if (!pid || !Storage.getProfile(pid)) { router.replace("/welcome"); return; }
    const profile = Storage.getProfile(pid)!;
    if (!profile.onboardingCompleted) { router.replace("/onboarding"); return; }
  }, [router]);

  if (!mounted) return null;

  return <AppShell>{children}</AppShell>;
}
