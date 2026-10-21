"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Clipboard, ExternalLink, Loader2 } from "lucide-react";
import { Button, Field, cn } from "@/components/ui";

type Step = "paste" | "testing" | "deploying" | "done" | "error";

export function SetupForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<Step>("paste");
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((l) => [...l, msg]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed.startsWith("postgresql://") && !trimmed.startsWith("postgres://")) {
      setError("This doesn't look like a Postgres connection string. It should start with postgresql:// or postgres://");
      return;
    }

    setStep("testing");
    setError(null);
    setLog([]);
    addLog("Testing database connection…");

    try {
      const testRes = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "test", databaseUrl: trimmed }),
      });
      const testData = (await testRes.json()) as { ok: boolean; error?: string; tables?: number };
      if (!testData.ok) {
        setStep("error");
        setError(testData.error ?? "Connection failed.");
        return;
      }
      addLog(`✓ Connected! Found ${testData.tables ?? 0} existing tables.`);

      addLog("Setting DATABASE_URL in Vercel…");
      setStep("deploying");

      const deployRes = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "deploy", databaseUrl: trimmed }),
      });
      const deployData = (await deployRes.json()) as { ok: boolean; error?: string; redeployed?: boolean };
      if (!deployData.ok) {
        setStep("error");
        setError(deployData.error ?? "Could not save to Vercel.");
        return;
      }
      addLog("✓ Saved to Vercel.");
      if (deployData.redeployed) addLog("✓ Redeploy triggered — live in ~30 seconds.");
      else addLog("Note: redeploy when ready.");

      addLog("Bootstrapping schema on the database…");
      const bootRes = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "bootstrap", databaseUrl: trimmed }),
      });
      const bootData = (await bootRes.json()) as { ok: boolean; error?: string; tables?: number };
      if (!bootData.ok) {
        addLog(`⚠ Bootstrap: ${bootData.error ?? "warning"} — tables may already exist, will retry on redeploy.`);
      } else {
        addLog(`✓ Schema ready (${bootData.tables ?? "all"} tables created).`);
      }

      setStep("done");
    } catch {
      setStep("error");
      setError("Network error — check your connection and try again.");
    }
  }

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      {/* Instructions */}
      <div className="mb-6 rounded-2xl border border-[var(--c-line)] p-4">
        <p className="text-sm font-semibold">Where to find it:</p>
        <ol className="mt-2 grid gap-1.5 text-[13px] text-sub">
          <li>1. Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-accent underline">Supabase Dashboard</a></li>
          <li>2. Select your project</li>
          <li>3. Go to <strong>Settings → Database</strong></li>
          <li>4. Copy the <strong>Connection string (URI)</strong></li>
          <li className="text-faint">   (Use the &ldquo;Session pooler&rdquo; variant, port 6543)</li>
          <li>5. Paste it below — include the password</li>
        </ol>
      </div>

      <form onSubmit={onSubmit}>
        <Field label="Postgres connection string" htmlFor="db-url" hint="postgresql://postgres.xxxxx:password@....pooler.supabase.com:6543/postgres">
          <input
            id="db-url"
            type="password"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); setStep("paste"); }}
            placeholder="postgresql://postgres.xxxxx:password@..."
            className="w-full rounded-xl border border-[var(--c-line)] bg-[var(--c-raised)] px-3.5 h-12 text-[15px] text-ink placeholder:text-faint transition-colors hover:border-[var(--c-line-strong)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-bad">
            {error}
          </p>
        )}

        {log.length > 0 && (
          <div className="mt-3 rounded-xl border border-[var(--c-line)] bg-[var(--c-raised)] p-3">
            {log.map((l, i) => (
              <p key={i} className={cn("text-[13px] font-mono", l.startsWith("✓") ? "text-ok" : l.startsWith("⚠") ? "text-warn" : "text-sub")}>{l}</p>
            ))}
          </div>
        )}

        {step === "done" ? (
          <div className="mt-5 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/20 text-ok">
              <CheckIcon className="size-6" />
            </div>
            <p className="mt-3 text-sm font-semibold">All set!</p>
            <p className="mt-1 text-[13px] text-sub">
              The new deployment will be live in about 30 seconds.
              After that, sign-in will work.
            </p>
            <a href="/sign-in" className="mt-4 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-white">
              Go to sign-in →
            </a>
          </div>
        ) : (
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={!url.trim() || step === "testing" || step === "deploying"}
            loading={step === "testing" || step === "deploying"}
          >
            {step === "testing" ? "Testing connection…" : step === "deploying" ? "Deploying…" : "Connect & Deploy"}
          </Button>
        )}
      </form>
    </div>
  );
}
