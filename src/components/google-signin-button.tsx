"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import {
  firebaseAuthErrorMessage,
  resolveGoogleRedirect,
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  waitForFirebaseUser,
} from "@/lib/firebase";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/* Real Firebase Google sign-in:
 * 1. resolves a pending redirect (after popup fallback round-trip)
 * 2. auto-restores: if Firebase still holds a session, its verified token is
 *    exchanged for a LifeOS session without a second click
 * 3. click → popup; popup blocked → full-page redirect fallback
 * 4. token verified server-side (see /api/auth/firebase) */
export function GoogleSignInButton() {
  const router = useRouter();
  const [pending, setPending] = useState(true); // true during restore check
  const [error, setError] = useState<string | null>(null);
  const exchanging = useRef(false);

  const exchange = useCallback(
    async (user: User) => {
      if (exchanging.current) return;
      exchanging.current = true;
      setPending(true);
      try {
        const idToken = await user.getIdToken();
        const res = await api<{ next?: string }>("/api/auth/firebase", "POST", { idToken });
        if (!res.ok) {
          setError(res.error ?? "Could not verify your Google sign-in.");
          return;
        }
        router.push(res.data?.next ?? "/today");
        router.refresh();
      } catch {
        setError("Network error — check your connection and try again.");
      } finally {
        exchanging.current = false;
        setPending(false);
      }
    },
    [router],
  );

  // Resolve redirect result + restore an existing Firebase session once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fromRedirect = await resolveGoogleRedirect();
        if (cancelled) return;
        if (fromRedirect) return exchange(fromRedirect);
        const existing = await waitForFirebaseUser();
        if (cancelled) return;
        if (existing) return exchange(existing);
        setPending(false); // no Google session → show the button
      } catch {
        if (!cancelled) setPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exchange]);

  async function onClick() {
    if (pending || exchanging.current) return; // duplicate-click guard
    setError(null);
    setPending(true);
    try {
      const user = await signInWithGooglePopup();
      await exchange(user);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-blocked") {
        // Reliable fallback: full-page redirect (page navigates away).
        try {
          await signInWithGoogleRedirect();
          return; // never resolves here — redirect continues on next load
        } catch (e2) {
          setError(firebaseAuthErrorMessage((e2 as { code?: string }).code));
        }
      } else {
        setError(firebaseAuthErrorMessage(code));
      }
      setPending(false);
    }
  }

  return (
    <div>
      <Button variant="subtle" size="lg" className="w-full" onClick={onClick} loading={pending} aria-label="Continue with Google">
        {!pending && <GoogleMark className="size-5" />}
        Continue with Google
      </Button>
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
