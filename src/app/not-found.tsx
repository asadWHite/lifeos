import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="glass animate-pop w-full max-w-md rounded-3xl p-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Compass className="size-7" aria-hidden />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold">Lost in time</h1>
        <p className="mt-2 text-sm text-sub">
          This page doesn&rsquo;t exist — but your day is still on the timeline.
        </p>
        <Link
          href="/today"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
        >
          Back to Today
        </Link>
      </div>
    </main>
  );
}
