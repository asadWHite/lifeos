/**
 * LIFEOS assistant engine — deterministic, honest, rule-based responses.
 *
 * When an AI provider key is configured, the API route uses a real model
 * instead (see src/app/api/assistant). This engine is the clearly-labelled
 * fallback: its output is always marked `origin: 'rules'` so nothing is
 * presented as AI when it isn't.
 *
 * Actions are proposals — the client must confirm before they are applied,
 * and application goes through validated server actions (never direct
 * model-driven mutations).
 */

import { formatDuration } from "./time";
import { statusForSession, STATUS_UI } from "./sleep";

export type AssistantContext = {
  name: string;
  lifeStageLabel: string | null;
  objectiveLabels: string[];
  interestLabels: string[];
  sleepTargetMinutes: number | null;
  bedtime: string | null;
  wakeTime: string | null;
  today: Array<{ title: string; done: boolean; priority: string; durationMinutes: number | null }>;
  overdueCount: number;
  tomorrowCount: number;
  goals: Array<{ title: string; percent: number | null; explanation: string }>;
  lastSleepMinutes: number | null;
  weekSleepAverage: number | null;
  energy: string | null;
};

export type AssistantProposal = {
  type: "createTask";
  title: string;
  priority: "low" | "normal" | "high";
  durationMinutes: number | null;
  due: "today" | "tomorrow";
};

export type AssistantResponse = {
  reply: string;
  proposals: AssistantProposal[];
};

const MEDICAL_DISCLAIMER =
  "Quick note: I share general, evidence-informed guidance only — nothing here is medical advice.";

function extractTaskTitle(message: string): string | null {
  // "add a task to call the dentist", "remind me to water plants", "create task buy milk"
  const patterns = [
    /(?:add|create|new)\s+(?:a\s+)?task\s+(?:to\s+)?(.+)/i,
    /remind\s+me\s+to\s+(.+)/i,
    /^(?:to-?do|todo)\s*[:\-]\s*(.+)/i,
  ];
  for (const p of patterns) {
    const match = message.match(p);
    if (match?.[1]) {
      const title = match[1]
        .trim()
        .replace(/\bfor\s+\d+\s*(?:min|minutes|hours?|hrs?|h)\b/i, "") // strip "for 20 min"
        .replace(/\b(?:due\s+)?(?:today|tomorrow)\b/i, "") // strip "tomorrow"
        .replace(/\s{2,}/g, " ")
        .trim()
        .replace(/[.!?,\s]+$/, "");
      if (title.length >= 2 && title.length <= 120) {
        return title.charAt(0).toUpperCase() + title.slice(1);
      }
    }
  }
  return null;
}

function isGreeting(msg: string): boolean {
  return /^(hi|hello|hey|good\s(morning|afternoon|evening)|yo)\b/i.test(msg.trim());
}

export function ruleBasedReply(rawMessage: string, ctx: AssistantContext): AssistantResponse {
  const msg = rawMessage.trim();
  const lower = msg.toLowerCase();

  // --- Greetings -----------------------------------------------------------
  if (isGreeting(msg) && msg.length < 30) {
    return {
      reply: `Hello ${ctx.name}. I'm your LIFEOS assistant running on built-in rules right now — every answer comes from your real, stored data. I can create tasks, plan your day, summarize progress, or talk through your sleep routine. What would you like to do?`,
      proposals: [],
    };
  }

  // --- Task creation -------------------------------------------------------
  const taskTitle = extractTaskTitle(msg);
  if (taskTitle) {
    const due = /tomorrow/.test(lower) ? "tomorrow" : "today";
    const high = /important|urgent|asap|critical/.test(lower);
    const durMatch = msg.match(/(\d+)\s*(min|minutes|hours?|hrs?|h)\b/i);
    let durationMinutes: number | null = null;
    if (durMatch) {
      const n = Number(durMatch[1]);
      durationMinutes = /h/.test(durMatch[2].toLowerCase()) ? n * 60 : n;
    }
    return {
      reply: `I've prepared that as a task for ${due}. Confirm below and I'll add it.`,
      proposals: [
        {
          type: "createTask",
          title: taskTitle,
          priority: high ? "high" : "normal",
          durationMinutes,
          due,
        },
      ],
    };
  }

  // --- Plan the day --------------------------------------------------------
  if (/plan (my )?(day|today)|plan my|daily plan|organize my day|what should i do/.test(lower)) {
    const open = ctx.today.filter((t) => !t.done);
    if (open.length === 0) {
      return {
        reply:
          "You have no open tasks for today yet. Tell me what's on your mind — for example “add a task to review my project notes” — and I'll turn it into tasks you can confirm.",
        proposals: [],
      };
    }
    const highs = open.filter((t) => t.priority === "high");
    const rest = open.filter((t) => t.priority !== "high");
    const lines = [...highs, ...rest].map((t, i) => {
      const dur = t.durationMinutes ? ` · about ${formatDuration(t.durationMinutes)}` : "";
      return `${i + 1}. ${t.title}${dur}`;
    });
    const total = open.reduce((a, t) => a + (t.durationMinutes ?? 0), 0);
    const totalLine =
      total > 0 ? `\n\nEstimated effort: ${formatDuration(total)} in total.` : "";
    const overdueLine =
      ctx.overdueCount > 0
        ? `\n\nYou also have ${ctx.overdueCount} overdue task${ctx.overdueCount === 1 ? "" : "s"} — consider rescheduling or completing the most important one first.`
        : "";
    return {
      reply: `Here's a suggested order for today, high-priority first. You can reorder or edit everything on Home:\n\n${lines.join("\n")}${totalLine}${overdueLine}`,
      proposals: [],
    };
  }

  // --- Summary -------------------------------------------------------------
  if (/summar|recap|how (was|is) my day|overview|status/.test(lower)) {
    const done = ctx.today.filter((t) => t.done).length;
    const total = ctx.today.length;
    const parts: string[] = [];
    parts.push(
      total === 0
        ? "No tasks planned for today yet."
        : `Tasks: ${done} of ${total} completed today.`,
    );
    if (ctx.lastSleepMinutes != null) {
      // In the context of assistant, we might not have the actual wake time string easily accessible 
      // but we can pass null for now to get duration-based status if needed, 
      // or we assume it's just general durations.
      const status = statusForSession(ctx.lastSleepMinutes, null, null);
      parts.push(
        `Sleep last night: ${formatDuration(ctx.lastSleepMinutes)}${
          ctx.sleepTargetMinutes ? ` (target ${formatDuration(ctx.sleepTargetMinutes)})` : ""
        }${status ? ` — ${(STATUS_UI as any)[status].label.toLowerCase()}` : ""}.`,
      );
    }
    if (ctx.goals.length > 0) {
      const g = ctx.goals[0];
      parts.push(
        g.percent == null
          ? `Goal in focus: “${g.title}” — not measurable yet.`
          : `Goal in focus: “${g.title}” at ${g.percent}% (${g.explanation}).`,
      );
    }
    if (ctx.energy) parts.push(`Energy check-in today: ${ctx.energy}.`);
    return {
      reply: `Here's where things stand:\n\n${parts.map((p) => `• ${p}`).join("\n")}`,
      proposals: [],
    };
  }

  // --- Sleep ---------------------------------------------------------------
  if (/sleep|bedtime|wake up|tired|insomnia|rest/.test(lower)) {
    const parts: string[] = [`${MEDICAL_DISCLAIMER}\n`];
    if (ctx.lastSleepMinutes != null) {
      parts.push(
        `Last night you recorded ${formatDuration(ctx.lastSleepMinutes)} of time in bed.`,
      );
    }
    if (ctx.weekSleepAverage != null) {
      parts.push(`Your past week averages ${formatDuration(ctx.weekSleepAverage)} per night.`);
    }
    if (ctx.sleepTargetMinutes) {
      parts.push(
        `Your configured target is ${formatDuration(ctx.sleepTargetMinutes)}${
          ctx.wakeTime
            ? ` — to hit it with a ${ctx.wakeTime} wake-up, aim to be in bed by ${ctx.bedtime ?? "your planned bedtime"}.`
            : "."
        }`,
      );
    }
    parts.push(
      "You can start sleep tracking from Home, and adjust your target and schedule in Settings → Sleep.",
    );
    return { reply: parts.join("\n"), proposals: [] };
  }

  // --- Goals ---------------------------------------------------------------
  if (/goal|progress|how am i doing|achiev/.test(lower)) {
    if (ctx.goals.length === 0) {
      return {
        reply:
          "You don't have any goals yet. Head to Goals to create one — give it a measurable target or link tasks to it and I'll track real progress.",
        proposals: [],
      };
    }
    const lines = ctx.goals.map((g) =>
      g.percent == null ? `• ${g.title} — not measurable yet` : `• ${g.title} — ${g.percent}% (${g.explanation})`,
    );
    return {
      reply: `Your active goals:\n\n${lines.join("\n")}\n\nProgress is computed only from real task completions or targets you configured.`,
      proposals: [],
    };
  }

  // --- Reorganize / reschedule --------------------------------------------
  if (/reorgan|resched|too much|overwhelm|prioriti/.test(lower)) {
    const open = ctx.today.filter((t) => !t.done);
    if (open.length <= 2) {
      return {
        reply:
          "Your day looks light — no reorganization needed. If something still feels heavy, try splitting the biggest task into the smallest next step you can finish in under 15 minutes.",
        proposals: [],
      };
    }
    const essentials = open.filter((t) => t.priority === "high").slice(0, 2);
    const deferred = open.filter((t) => t.priority !== "high").slice(0, 3);
    return {
      reply: `A simple way to lighten today: keep only what truly matters. I suggest keeping:\n${
        essentials.length ? essentials.map((t) => `• ${t.title}`).join("\n") : "• your top 2 tasks"
      }\n\nAnd consider moving to tomorrow:\n${deferred.map((t) => `• ${t.title}`).join("\n")}\n\nYou can adjust due dates with one tap on each task.`,
      proposals: [],
    };
  }

  // --- Fallback ------------------------------------------------------------
  return {
    reply: `I can help with a few things right now:\n\n• "Add a task to …" — create tasks from plain language\n• "Plan my day" — order today's tasks sensibly\n• "Summarize my day" — a quick status recap\n• "How is my sleep?" — duration stats and schedule help\n• "How are my goals?" — real progress, no invented numbers\n\nTry one of those, or type anything containing "add a task" to get started.`,
    proposals: [],
  };
}
