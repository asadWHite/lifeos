"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Storage } from "@/lib/client/storage";

export default function Root() {
  const router = useRouter();

  useEffect(() => {
    const pid = Storage.getCurrentProfileId();
    if (!pid) {
      router.push("/welcome");
      return;
    }
    const profile = Storage.getProfile(pid);
    if (!profile) {
      router.push("/welcome");
      return;
    }
    if (!profile.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }
    router.push("/home");
  }, [router]);

  return null;
}
