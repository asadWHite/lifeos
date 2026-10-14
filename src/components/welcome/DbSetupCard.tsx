"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleAlert, Database, KeyRound, RefreshCw } from "lucide-react";
import type { DatabaseIssue, DatabaseStatus } from "@/server/runtime-status";
import { Spinner } from "@/components/ui";

/**
 * Shown when LIFEOS cannot reach its database or cannot find its tables.
 * Everything here is written for a non-technical reader: what happened, why,
 * and the exact next step — plus a retry button so the page is never a dead end.
 */
export function DbSetupCard({
  issue,
  status,
}: {
  issue: DatabaseIssue;
  status: DatabaseStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checked, setChecked] = useState(false);

  function recheck() {
    setChecked(false);
    start(async () => {
      router.refresh();
      setChecked(true);
    });
  }

  return (
    <div className="card p-6 sm:p-7 animate-rise">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-soft text-amber">
        <CircleAlert size={20} strokeWidth={1.9} />
      </div>
      <h2 className="mt-4 text-[24px] font-bold tracking-tight text-ink">{issue.title}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink2">{issue.body}</p>

      <p className="mt-3 rounded-[12px] bg-sunken p-4 text-[13px] leading-relaxed text-ink2">
        <strong className="font-semibold text-ink">
          {issue.kind === "missing_database_url" ? "What to add in Vercel:" : "How to fix it:"}
        </strong>
        {issue.kind === "missing_database_url" && (
          <>
            <br />
            <code className="mt-1 inline-block rounded bg-surface px-2 py-1 text-[12px] text-ink">
              DATABASE_URL=postgresql://...
            </code>
          </>
        )}
        <br />
        <span className="mt-2 inline-block">{issue.hint}</span>
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[12px] border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <Database size={15} className="text-ink3" />
            What the server can see
          </p>
          <ul className="mt-3 space-y-2 text-[12.5px] text-ink2">
            <li>DATABASE_URL: {status.hasDatabaseUrl ? "present" : "missing"}</li>
            <li>SUPABASE URL: {status.hasSupabaseUrl ? "present" : "missing"}</li>
            <li>SUPABASE ANON KEY: {status.hasSupabaseAnonKey ? "present" : "missing"}</li>
            <li>SERVICE ROLE KEY: {status.hasSupabaseServiceRole ? "present" : "missing"}</li>
          </ul>
        </div>
        <div className="rounded-[12px] border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <KeyRound size={15} className="text-ink3" />
            Good to know
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[12.5px] leading-relaxed text-ink2">
            <li>Supabase API keys are not the same thing as DATABASE_URL.</li>
            <li>LIFEOS creates its own tables automatically the first time it connects.</li>
            <li>After changing an environment variable, redeploy the project.</li>
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={recheck} disabled={pending}>
          {pending ? <Spinner size={15} /> : <RefreshCw size={15} />}
          {pending ? "Checking…" : "Check again"}
        </button>
        <a className="text-[12.5px] font-medium text-ink3 underline" href="/api/health" target="_blank" rel="noreferrer">
          Open the connection report
        </a>
        {checked && !pending && (
          <span className="text-[12.5px] text-ink3">Still not ready — the steps above are not applied yet.</span>
        )}
      </div>
    </div>
  );
}
