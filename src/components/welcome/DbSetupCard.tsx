import { CircleAlert, Database, KeyRound } from "lucide-react";
import type { DatabaseIssue, DatabaseStatus } from "@/server/runtime-status";

export function DbSetupCard({
  issue,
  status,
}: {
  issue: DatabaseIssue;
  status: DatabaseStatus;
}) {
  return (
    <div className="card p-6 sm:p-7 animate-rise">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-soft text-amber">
        <CircleAlert size={20} strokeWidth={1.9} />
      </div>
      <h2 className="mt-4 text-[24px] font-bold tracking-tight text-ink">{issue.title}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink2">{issue.body}</p>
      <p className="mt-3 rounded-[12px] bg-sunken p-4 text-[13px] leading-relaxed text-ink2">
        <strong className="font-semibold text-ink">What to add in Vercel:</strong>
        <br />
        <code className="mt-1 inline-block rounded bg-surface px-2 py-1 text-[12px] text-ink">
          DATABASE_URL=postgresql://...
        </code>
        <br />
        <span className="mt-2 inline-block">{issue.hint}</span>
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[12px] border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <Database size={15} className="text-ink3" />
            Runtime env status
          </p>
          <ul className="mt-3 space-y-2 text-[12.5px] text-ink2">
            <li>DATABASE_URL: {status.hasDatabaseUrl ? "present" : "missing"}</li>
            <li>NEXT_PUBLIC_SUPABASE_URL: {status.hasSupabaseUrl ? "present" : "missing"}</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {status.hasSupabaseAnonKey ? "present" : "missing"}</li>
            <li>SUPABASE_SERVICE_ROLE_KEY: {status.hasSupabaseServiceRole ? "present" : "missing"}</li>
          </ul>
        </div>
        <div className="rounded-[12px] border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <KeyRound size={15} className="text-ink3" />
            Important
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[12.5px] leading-relaxed text-ink2">
            <li>Supabase API keys are not the same thing as DATABASE_URL.</li>
            <li>For serverless deployments, the Supabase pooler URI is usually the safest option.</li>
            <li>After adding DATABASE_URL, redeploy the project.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
