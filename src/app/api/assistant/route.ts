import { NextResponse } from "next/server";
import { getSession } from "@/server/session";
import { buildAssistantContext, saveAssistantMessage } from "@/server/assistant";
import { ruleBasedReply, type AssistantProposal } from "@/lib/assistant";
import { assistantProposalSchema, assistantRequestSchema } from "@/lib/validation";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Assistant API — the single, server-side AI boundary.
 *
 * Priority:
 *  1. If OPENAI_API_KEY is configured → call an OpenAI-compatible chat
 *     endpoint with a minimal, structured context. The model returns a JSON
 *     object { reply, proposals } whose proposals are zod-validated and only
 *     *proposed* to the user (never executed without confirmation).
 *  2. Otherwise → the transparent rule-based engine answers. Responses are
 *     marked origin "rules" so the UI never presents them as AI output.
 *
 * The API key never leaves the server.
 */

const PROVIDER_TIMEOUT_MS = 12_000;

function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const aiResponseSchema = z.object({
  reply: z.string().min(1).max(4000),
  proposals: z.array(assistantProposalSchema).max(4).default([]),
});

type AssistantApiResponse = {
  ok: boolean;
  reply: string;
  proposals: AssistantProposal[];
  origin: "ai" | "rules";
  notice?: string;
};

async function callModel(
  message: string,
  contextJson: string,
): Promise<{ reply: string; proposals: AssistantProposal[] }> {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are LIFEOS, a calm personal planning assistant. You respond with strict JSON only:",
              '{"reply": string, "proposals": [{"type":"createTask","title":string,"priority":"low|normal|high","durationMinutes":number|null,"due":"today|tomorrow"}]}',
              "Rules:",
              "- Be concise, warm and practical. No medical, diagnostic, or mental-health advice; for health topics share general guidance and suggest a professional.",
              "- Use the provided user context; never invent tasks, sleep data, or statistics.",
              "- Only add createTask proposals when the user clearly wants a task created. Keep proposals under 5.",
              "- Never claim you performed an action; proposals must be confirmed by the user.",
            ].join("\n"),
          },
          { role: "user", content: `Context (authorized user data):\n${contextJson}\n\nUser message:\n${message}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Provider responded ${res.status}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty provider response");
    const parsed = aiResponseSchema.parse(JSON.parse(raw));
    return {
      reply: parsed.reply,
      proposals: parsed.proposals.map((p) => ({
        ...p,
        durationMinutes: p.durationMinutes ?? null,
      })),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request): Promise<NextResponse<AssistantApiResponse>> {
  const session = await getSession();
  if (!session || !session.profile.onboardingCompleted) {
    return NextResponse.json(
      { ok: false, reply: "Please finish onboarding first.", proposals: [], origin: "rules" },
      { status: 401 },
    );
  }

  let message = "";
  try {
    const body = assistantRequestSchema.parse(await request.json());
    message = body.message;
  } catch {
    return NextResponse.json(
      { ok: false, reply: "I couldn't read that message.", proposals: [], origin: "rules" },
      { status: 400 },
    );
  }

  const ctx = await buildAssistantContext(session);
  await saveAssistantMessage(session.profile.id, "user", message, "rules");

  if (isAiConfigured()) {
    try {
      const contextJson = JSON.stringify(ctx);
      const { reply, proposals } = await callModel(message, contextJson);
      await saveAssistantMessage(session.profile.id, "assistant", reply, "ai");
      return NextResponse.json({ ok: true, reply, proposals, origin: "ai" });
    } catch (error) {
      console.error("[lifeos] AI provider error, falling back to rules:", error);
      const fallback = ruleBasedReply(message, ctx);
      const reply = `${fallback.reply}\n\n(The AI provider couldn't be reached, so this answer comes from LIFEOS's built-in rules instead.)`;
      await saveAssistantMessage(session.profile.id, "assistant", reply, "rules");
      return NextResponse.json({
        ok: true,
        reply,
        proposals: fallback.proposals,
        origin: "rules",
        notice: "ai_unavailable",
      });
    }
  }

  const { reply, proposals } = ruleBasedReply(message, ctx);
  await saveAssistantMessage(session.profile.id, "assistant", reply, "rules");
  return NextResponse.json({ ok: true, reply, proposals, origin: "rules" });
}
