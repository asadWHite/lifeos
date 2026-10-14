"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";

/** Compact assistant entry point used on Home. */
export function BrainTeaser({ prompts }: { prompts: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(e?: FormEvent, direct?: string) {
    e?.preventDefault();
    const q = direct ?? value.trim();
    router.push(q ? `/brain?m=${encodeURIComponent(q)}` : "/brain");
  }

  return (
    <div>
      <form onSubmit={go} className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2.5 transition-colors focus-within:border-accent">
        <Sparkles size={16} className="shrink-0 text-accent" aria-hidden />
        <label htmlFor="brain-teaser" className="sr-only">
          Ask the assistant
        </label>
        <input
          id="brain-teaser"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask LIFEOS anything…"
          maxLength={300}
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink3"
        />
        <button type="submit" className="icon-btn !text-accent" aria-label="Send">
          <ArrowUpRight size={17} />
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {prompts.slice(0, 3).map((p) => (
          <button
            key={p}
            onClick={(e) => go(e, p)}
            className="rounded-full bg-sunken px-3 py-1.5 text-[12px] font-medium text-ink2 transition-colors hover:bg-accent-soft hover:text-accent-ink"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
