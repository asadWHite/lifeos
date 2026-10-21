import type { Metadata } from "next";
import { resolvePostgresUrl } from "@/lib/supabase";
import { SetupForm } from "@/components/setup-form";

export const metadata: Metadata = { title: "LifeOS Setup" };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  const pg = resolvePostgresUrl();

  if (pg.url) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="glass animate-pop w-full max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success/15 text-ok">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold">Database connected</h1>
          <p className="mt-2 text-sm text-sub">
            Using <code className="font-mono text-accent">{pg.source}</code>. Everything is working.
          </p>
          <a href="/sign-in" className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-white">
            Go to LifeOS →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">LifeOS Setup</p>
          <h1 className="mt-3 font-display text-3xl font-semibold">Connect your database</h1>
          <p className="mt-2 text-sm text-sub">
            Paste your Supabase connection string below — LifeOS will configure itself automatically.
          </p>
        </div>
        <SetupForm />
      </div>
    </main>
  );
}
