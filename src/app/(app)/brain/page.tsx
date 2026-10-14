import { CircleCheck, Database, Eye, KeyRound } from "lucide-react";
import { requireOnboarded } from "@/server/session";
import { listAssistantMessages } from "@/server/data";
import { personalize } from "@/lib/personalization";
import { Chat } from "@/components/brain/Chat";

export const dynamic = "force-dynamic";

export default async function BrainPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOnboarded();
  const { profile, prefs } = session;
  const params = await searchParams;
  const initialQuery = typeof params.m === "string" ? params.m.slice(0, 300) : null;

  const history = await listAssistantMessages(profile.id, 50);
  const config = personalize({
    ageGroup: prefs.ageGroup,
    lifeStage: prefs.lifeStage,
    interests: prefs.interests,
    objectives: prefs.objectives,
    planningStyle: prefs.planningStyle,
    difficulties: prefs.difficulties,
    personalTime: prefs.personalTime,
    sleepTargetMinutes: prefs.sleepTargetMinutes,
  });

  const aiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const modelName = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  return (
    <div className="animate-rise grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <header className="pb-4">
          <h1 className="text-[26px] font-bold tracking-tight text-ink">Brain</h1>
          <p className="mt-1 text-[14px] text-ink2">
            Your assistant for planning, tasks, and answers about your own data.
          </p>
        </header>

        {!aiConfigured && (
          <div className="card mb-4 flex items-start gap-3 border-info-soft bg-info-soft/60 p-4">
            <KeyRound size={17} className="mt-0.5 shrink-0 text-info" />
            <div className="text-[13px] leading-relaxed text-ink2">
              <p className="font-semibold text-ink">Running on built-in rules — clearly labelled below each reply.</p>
              <p className="mt-1">
                To connect a real AI model, set <code className="rounded bg-surface px-1.5 py-0.5 text-[12px]">OPENAI_API_KEY</code>
                (and optionally <code className="rounded bg-surface px-1.5 py-0.5 text-[12px]">OPENAI_BASE_URL</code> /{" "}
                <code className="rounded bg-surface px-1.5 py-0.5 text-[12px]">OPENAI_MODEL</code>) in your environment, then restart
                the app. Keys stay server-side only. Until then, answers still come from your real data — just without generative language.
              </p>
            </div>
          </div>
        )}

        <Chat
          initialMessages={history.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            origin: m.origin as "ai" | "rules",
          }))}
          prompts={config.quickPrompts}
          initialQuery={initialQuery}
        />
      </div>

      {/* Transparency panel */}
      <aside className="space-y-5">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
            <Eye size={15} className="text-ink3" />
            What I can use to answer
          </h2>
          <ul className="mt-3 space-y-2.5">
            {[
              "Today's tasks and overdue items",
              "Active goals and their real progress",
              "Sleep totals (last night + weekly average)",
              "Your explicit onboarding preferences",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink2">
                <CircleCheck size={14} className="mt-0.5 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
          <div className="divider my-4" />
          <p className="flex items-start gap-2.5 text-[12px] leading-relaxed text-ink3">
            <Database size={14} className="mt-0.5 shrink-0" />
            Only this summarized context is used — never your full history. Nothing is sent to an
            external model unless you configure an AI key, and task changes always need your confirmation.
          </p>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
            <KeyRound size={15} className="text-ink3" />
            Engine status
          </h2>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`badge ${aiConfigured ? "bg-accent-soft text-accent-ink" : "bg-sunken text-ink2"}`}
            >
              {aiConfigured ? `AI connected · ${modelName}` : "Built-in rules"}
            </span>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink3">
            {aiConfigured
              ? "Replies marked “AI model” come from your configured provider; “built-in rules” replies are local fallbacks."
              : "Every reply is labelled by its origin. LIFEOS never presents rule output as AI-generated."}
          </p>
        </div>
        <p className="px-1 text-[11.5px] leading-relaxed text-ink3">
          Life topics are general guidance, not medical advice. For health concerns, please
          talk to a qualified professional.
        </p>
      </aside>
    </div>
  );
}
