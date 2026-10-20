import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Welcome" };

/* Server-side mirror of the client env check — NEXT_PUBLIC_* vars are
 * available to the server bundle too. */
function firebaseServerStatus(): { configured: boolean; missing: string[] } {
  const required = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
  return { configured: missing.length === 0, missing };
}

export default async function SignInPage() {
  const user = await getSessionUser();
  if (user) redirect(user.onboardingCompleted ? "/today" : "/onboarding");

  const firebase = firebaseServerStatus();

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      {/* TimeFlow motif: drifting horizon lines */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[150vmin] w-[150vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--c-line)] opacity-60" />
        <div className="absolute left-1/2 top-1/2 h-[105vmin] w-[105vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--c-line)] opacity-45" />
        <div className="absolute left-1/2 top-1/2 h-[64vmin] w-[64vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--c-line)] opacity-30" />
        <div className="absolute left-1/2 top-1/2 h-[30vmin] w-[30vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20" />
      </div>

      <div className="animate-page relative w-full max-w-105">
        <div className="mb-8 text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.3em] text-accent">LifeOS</p>
          <h1 className="mt-3 font-display text-[2.6rem] leading-[1.05] font-semibold text-balance">
            Your day, in one
            <span className="text-accent"> flowing</span> line.
          </h1>
          <p className="mt-3 text-[15px] text-sub">
            TimeFlow turns your schedule, sleep, habits and goals into a single timeline that always knows what&rsquo;s now and what&rsquo;s next.
          </p>
        </div>
        <AuthForm firebaseConfigured={firebase.configured} firebaseMissing={firebase.missing} />
      </div>
    </main>
  );
}
