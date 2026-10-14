"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

/**
 * Friendly fallback for unexpected server errors.
 *
 * Without this, Next.js shows its raw developer error ("Application error:
 * a server-side exception has occurred"), which tells a normal person nothing.
 * Here the user always learns three things: nothing was lost, what to try, and
 * where to go if the database itself is the problem.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lifeos] page error:", error);
  }, [error]);

  const looksLikeDatabase =
    /database|DATABASE_URL|ECONNREFUSED|ENOTFOUND|relation .* does not exist|connect/i.test(
      `${error.message} ${error.digest ?? ""}`,
    );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <div className="card w-full max-w-lg p-7 animate-rise">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-soft text-amber">
          <TriangleAlert size={20} strokeWidth={1.9} />
        </div>
        <h1 className="mt-4 text-[24px] font-bold tracking-tight text-ink">
          Something went wrong on this screen
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink2">
          Nothing you saved was lost — LIFEOS simply failed to load this page. Try again
          first; if it keeps happening, the database connection is the usual cause.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={reset}>
            <RefreshCw size={15} />
            Try again
          </button>
          <Link className="btn btn-secondary" href="/welcome">
            Go to setup
          </Link>
          <a
            className="text-[12.5px] font-medium text-ink3 underline"
            href="/api/health"
            target="_blank"
            rel="noreferrer"
          >
            Connection report
          </a>
        </div>

        {looksLikeDatabase && (
          <p className="mt-4 rounded-[12px] bg-sunken p-4 text-[12.5px] leading-relaxed text-ink2">
            This looks like a database problem. Open <strong className="text-ink">Go to setup</strong>{" "}
            for the exact steps, or check that <code>DATABASE_URL</code> is set in your hosting
            environment and redeploy.
          </p>
        )}

        <details className="mt-4 text-[12px] text-ink3">
          <summary className="cursor-pointer select-none font-medium">Technical details</summary>
          <p className="mt-2 break-words rounded-[10px] bg-sunken p-3 font-mono text-[11.5px] text-ink2">
            {error.message}
            {error.digest ? ` (digest: ${error.digest})` : ""}
          </p>
        </details>
      </div>
    </div>
  );
}
