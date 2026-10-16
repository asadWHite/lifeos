"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Storage } from "@/lib/client/storage";
import { AppShell } from "@/components/shell/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const pid = Storage.getCurrentProfileId();
    if (!pid) { router.push("/welcome"); return; }
    
    const p = Storage.getProfile(pid);
    if (!p) { router.push("/welcome"); return; }
    
    if (!p.onboardingCompleted) { router.push("/onboarding"); return; }

    setProfile(p);
    setGoals(Storage.getGoals().filter(g => g.profileId === pid && g.status === "active").map(g => ({ id: g.id, title: g.title })));
  }, [router]);

  if (!mounted || !profile) return null;

  return (
    <AppShell name={profile.name} goals={goals}>
      {children}
    </AppShell>
  );
}
