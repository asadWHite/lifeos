"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Storage } from "@/lib/client/storage";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) { router.replace("/welcome"); return; }
    const profile = Storage.getProfile(pid);
    if (!profile) { router.replace("/welcome"); return; }
    if (!profile.onboardingCompleted) { router.replace("/onboarding"); return; }
    router.replace("/today");
  }, [router]);
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--c-bg)]">
      <div className="w-8 h-8 border-2 border-[var(--c-border)] border-t-[var(--c-ink)] rounded-full animate-spin" />
    </div>
  );
}
