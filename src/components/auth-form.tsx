"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button, Field, Input, cn } from "@/components/ui";
import { GoogleSignInButton } from "@/components/google-signin-button";

export function AuthForm({ firebaseConfigured, firebaseMissing }: { firebaseConfigured: boolean; firebaseMissing: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch(`/api/auth/${mode === "signin" ? "signin" : "signup"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        next?: string;
        issues?: { path: string; message: string }[];
      } | null;
      if (!res.ok || !data) {
        if (data?.issues) {
          const map: Record<string, string> = {};
          for (const i of data.issues) if (!map[i.path]) map[i.path] = i.message;
          setFieldErrors(map);
        }
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(data.next ?? "/today");
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass rounded-[1.75rem] p-6 sm:p-8">
      {firebaseConfigured ? (
        <GoogleSignInButton />
      ) : (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4" role="note">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-warn">Google sign-in not configured</p>
              <p className="mt-1 text-[13px] leading-relaxed text-sub">
                Set <code className="font-mono text-ink">{firebaseMissing.join(", ")}</code> to enable Firebase
                Google sign-in. Email sign-in below is fully functional.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="my-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[var(--c-line)]" />
        <span className="text-xs font-medium uppercase tracking-widest text-faint">or with email</span>
        <span className="h-px flex-1 bg-[var(--c-line)]" />
      </div>

      <div role="tablist" aria-label="Authentication mode" className="mb-5 grid grid-cols-2 rounded-full bg-[var(--c-line)] p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
              setFieldErrors({});
            }}
            className={cn(
              "h-9 rounded-full text-sm font-medium transition-all",
              mode === m ? "glass text-ink shadow" : "text-sub hover:text-ink",
            )}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
        {mode === "signup" && (
          <Field label="Full name" htmlFor="name" error={fieldErrors.name}>
            <Input id="name" name="name" autoComplete="name" placeholder="Aziz Karimov" maxLength={80} required />
          </Field>
        )}
        <Field label="Email" htmlFor="email" error={fieldErrors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </Field>
        <Field label="Password" htmlFor="password" error={fieldErrors.password} hint={mode === "signup" ? "At least 8 characters. Stored only as a secure hash." : undefined}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="••••••••"
            minLength={mode === "signup" ? 8 : 1}
            required
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-bad">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {mode === "signin" ? "Sign in to LifeOS" : "Create my account"}
        </Button>
      </form>
    </div>
  );
}
