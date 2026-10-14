"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createProfileAction, selectProfileAction } from "@/server/actions/account";
import { FieldError, Spinner } from "@/components/ui";

/**
 * Local profile gate — this is NOT authentication.
 * It identifies which local profile to open on this device. Supabase (or any
 * real auth provider) can replace this component without touching the
 * session's call sites.
 */
export function ProfileGate({ profiles }: { profiles: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Tell us what to call you.");
      return;
    }
    start(async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const res = await createProfileAction({ name: trimmed, timezone });
      if (res.ok) router.push("/onboarding");
      else setError(res.error);
    });
  }

  function open(id: string) {
    start(async () => {
      const res = await selectProfileAction(id);
      if (res.ok) router.push("/");
      else setError(res.error);
    });
  }

  return (
    <div>
      <h2 className="text-[26px] font-bold tracking-tight text-ink">
        {profiles.length > 0 ? "Welcome back" : "Welcome to LIFEOS"}
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink2">
        {profiles.length > 0
          ? "Pick a profile to continue, or create a new one."
          : "Create a local profile to get started — it lives on this device and takes about a minute to personalize."}
      </p>

      {profiles.length > 0 && (
        <div className="mt-6 space-y-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => open(p.id)}
              disabled={pending}
              className="card group flex w-full items-center gap-3 p-3.5 text-left transition-all hover:border-line-strong hover:shadow-raised disabled:opacity-60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-[15px] font-bold text-accent-ink">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-[15px] font-semibold text-ink">{p.name}</span>
              <ArrowRight size={16} className="text-ink3 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}

      <div className={profiles.length > 0 ? "mt-6 border-t border-line pt-6" : "mt-7"}>
        <label className="label" htmlFor="profile-name">
          {profiles.length > 0 ? "Or make a new profile" : "What should we call you?"}
        </label>
        <div className="flex gap-2">
          <input
            id="profile-name"
            className="input"
            placeholder="First name or nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            maxLength={40}
            autoComplete="off"
          />
          <button className="btn btn-primary shrink-0" onClick={create} disabled={pending}>
            {pending ? <Spinner size={15} /> : "Start"}
          </button>
        </div>
        <FieldError>{error}</FieldError>
        <p className="mt-4 text-[12px] leading-relaxed text-ink3">
          Local profiles are for this device only — no password needed yet. Real sign-in
          (Supabase-ready) can be enabled for multi-device sync in Settings later.
        </p>
      </div>
    </div>
  );
}
