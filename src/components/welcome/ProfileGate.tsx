"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Storage, generateId } from "@/lib/client/storage";
import { FieldError, Spinner } from "@/components/ui";

export function ProfileGate({ profiles }: { profiles: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function create() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Tell us what to call you."); return; }
    start(() => {
      const p = {
        id: generateId(),
        name: trimmed,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        onboardingCompleted: false,
        createdAt: new Date()
      };
      // @ts-ignore (ignoring exact type match for local storage)
      Storage.saveProfile(p);
      Storage.setCurrentProfileId(p.id);
      router.push("/onboarding");
      router.refresh();
    });
  }

  function open(id: string) {
    start(() => {
      Storage.setCurrentProfileId(id);
      router.push("/");
      router.refresh();
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
          : "Create a local profile to get started — it lives right here in your browser."}
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
          Running in Local-First mode. Your data stays entirely in your browser.
        </p>
      </div>
    </div>
  );
}
