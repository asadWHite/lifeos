"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Check, Sparkles } from "lucide-react";
import { applyTaskProposalAction } from "@/server/actions/tasks";
import type { AssistantProposal } from "@/lib/assistant";
import { Spinner } from "@/components/ui";
import { formatDuration } from "@/lib/time";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  origin: "ai" | "rules";
};

type ApiReply = {
  ok: boolean;
  reply: string;
  proposals: AssistantProposal[];
  origin: "ai" | "rules";
  notice?: string;
};

export function Chat({
  initialMessages,
  prompts,
  initialQuery,
}: {
  initialMessages: ChatMessage[];
  prompts: string[];
  initialQuery: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [proposals, setProposals] = useState<Record<number, AssistantProposal[]>>({});
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState(initialQuery ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    setInput("");
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", content: message, origin: "rules" },
    ]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as ApiReply;
      if (!res.ok || !data.ok) {
        setMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: "assistant", content: data.reply || "Something went wrong — please try again.", origin: "rules" },
        ]);
      } else {
        setMessages((m) => {
          const idx = m.length;
          if (data.proposals.length > 0) {
            setProposals((p) => ({ ...p, [idx]: data.proposals }));
          }
          return [
            ...m,
            { id: `a-${Date.now()}`, role: "assistant", content: data.reply, origin: data.origin },
          ];
        });
      }
    } catch {
      setError("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Auto-send the query passed from Home's teaser (once).
  useEffect(() => {
    if (initialQuery && !sentInitial.current) {
      sentInitial.current = true;
      send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  async function apply(msgIndex: number, pIndex: number, proposal: AssistantProposal) {
    const key = `${msgIndex}-${pIndex}`;
    const res = await applyTaskProposalAction(proposal);
    if (res.ok) setApplied((a) => ({ ...a, [key]: true }));
    else setError(res.error);
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-4 pb-4">
        {messages.length === 0 && !busy && (
          <div className="rounded-[14px] border border-dashed border-line-strong p-5">
            <p className="text-[14.5px] font-semibold text-ink">How can I help?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink2">
              Ask me to plan your day, create tasks from plain language, recap your progress,
              or talk through your sleep schedule. Everything I know comes from your actual LIFEOS data.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {prompts.map((p) => (
                <button key={p} className="chip" onClick={() => send(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={m.role === "user" ? "max-w-[85%] sm:max-w-[70%]" : "max-w-[92%] sm:max-w-[85%]"}>
              <div
                className={
                  m.role === "user"
                    ? "rounded-2xl rounded-br-[6px] bg-accent px-4 py-3 text-[14px] leading-relaxed text-white"
                    : "card rounded-bl-[6px] px-4 py-3 text-[14px] leading-relaxed text-ink"
                }
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              {m.role === "assistant" && (
                <p className="mt-1 flex items-center gap-1 px-1 text-[11px] text-ink3">
                  <Sparkles size={10} />
                  {m.origin === "ai" ? "AI model" : "Built-in rules"}
                </p>
              )}
              {proposals[i]?.map((p, pi) => {
                const key = `${i}-${pi}`;
                const done = applied[key];
                return (
                  <div key={key} className="card mt-2 flex flex-wrap items-center gap-3 p-3 animate-fade">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{p.title}</p>
                      <p className="text-[12px] text-ink3">
                        {p.due === "today" ? "Today" : "Tomorrow"}
                        {p.priority !== "normal" ? ` · ${p.priority} priority` : ""}
                        {p.durationMinutes ? ` · ${formatDuration(p.durationMinutes)}` : ""}
                      </p>
                    </div>
                    {done ? (
                      <span className="badge bg-accent-soft text-accent-ink">
                        <Check size={11} /> Added
                      </span>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => apply(i, pi, p)}
                      >
                        Add task
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 px-1 text-[13px] text-ink3">
            <Spinner size={14} />
            Thinking…
          </div>
        )}
        {error && (
          <p role="alert" className="px-1 text-[13px] font-medium text-red">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        className="sticky bottom-[72px] z-10 mt-2 flex items-center gap-2 rounded-[14px] border border-line-strong bg-surface p-2 pl-4 shadow-raised md:bottom-4"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message the assistant
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message LIFEOS…"
          maxLength={2000}
          className="w-full bg-transparent text-[14.5px] outline-none placeholder:text-ink3"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-white transition-all hover:bg-accent-hover disabled:opacity-40"
          aria-label="Send message"
        >
          <ArrowUp size={17} />
        </button>
      </form>
    </div>
  );
}
