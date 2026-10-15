import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { listProfiles } from "@/server/data";
import { ProfileGate } from "@/components/welcome/ProfileGate";
import { DbSetupCard } from "@/components/welcome/DbSetupCard";
import { Logo, Wordmark } from "@/components/Logo";
import { ListChecks, Lock, Moon, Sprout } from "lucide-react";
import {
  classifyDatabaseIssue,
  getDatabaseStatus,
} from "@/server/runtime-status";
import { ensureDatabase } from "@/server/ensure-db";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  // Try to auto-create tables on first visit
  await ensureDatabase();

  const session = await getSession();
  if (session) redirect("/");

  let existing: Array<{ id: string; name: string }> = [];
  let dbIssue: ReturnType<typeof classifyDatabaseIssue> | null = null;

  try {
    const profiles = await listProfiles();
    existing = profiles.map((p) => ({ id: p.id, name: p.name }));
  } catch (error) {
    console.error("[lifeos] welcome page database check failed:", error);
    dbIssue = classifyDatabaseIssue(error);
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 0%, #e7f0e9 0%, #f5f4ef 45%, #f5f4ef 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <Logo size={34} />
          <Wordmark size={20} />
        </div>
        <div className="max-w-md">
          <h1 className="text-[44px] font-bold leading-[1.05] tracking-[-0.035em] text-ink">
            Your life,
            <br />
            quietly organized.
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-ink2">
            Plan your days, sleep on a rhythm, and move toward your goals — with a system that adapts to you, not the other way around.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              { icon: ListChecks, text: "Gentle daily planning that stays out of your way" },
              { icon: Moon, text: "Honest sleep tracking with targets that fit your age" },
              { icon: Sprout, text: "Goals measured by real progress, never invented numbers" },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-[14.5px] font-medium text-ink">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                  <f.icon size={17} strokeWidth={1.9} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2.5 text-[12.5px] text-ink2">
          <Lock size={13} aria-hidden />
          Your data stays in your own database. No accounts, no ads, no tracking.
        </div>
      </div>

      {/* Gate */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo size={30} />
            <Wordmark />
          </div>
          {dbIssue ? (
            <DbSetupCard issue={dbIssue} status={getDatabaseStatus()} />
          ) : (
            <ProfileGate profiles={existing} />
          )}
        </div>
      </div>
    </div>
  );
}
