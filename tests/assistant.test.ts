import { describe, expect, it } from "vitest";
import { ruleBasedReply, type AssistantContext } from "../src/lib/assistant";

const ctx: AssistantContext = {
  name: "Maya",
  lifeStageLabel: "Employed",
  objectiveLabels: ["Improving sleep habits"],
  interestLabels: ["Technology & programming"],
  sleepTargetMinutes: 480,
  bedtime: "23:00",
  wakeTime: "07:00",
  today: [
    { title: "Review pull requests", done: false, priority: "high", durationMinutes: 30 },
    { title: "Buy groceries", done: false, priority: "normal", durationMinutes: null },
    { title: "Morning standup", done: true, priority: "normal", durationMinutes: 15 },
  ],
  overdueCount: 1,
  tomorrowCount: 0,
  goals: [{ title: "Learn a new skill", percent: 25, explanation: "1 of 4 tasks completed" }],
  lastSleepMinutes: 420,
  weekSleepAverage: 455,
  energy: "okay",
};

describe("ruleBasedReply", () => {
  it("extracts a clean task title, due day and duration", () => {
    const res = ruleBasedReply("add a task to call the dentist tomorrow for 20 min", ctx);
    expect(res.proposals).toHaveLength(1);
    expect(res.proposals[0]).toMatchObject({
      type: "createTask",
      title: "Call the dentist",
      due: "tomorrow",
      durationMinutes: 20,
    });
  });

  it("marks urgent tasks high priority", () => {
    const res = ruleBasedReply("remind me to submit the urgent visa form", ctx);
    expect(res.proposals[0]?.priority).toBe("high");
  });

  it("plans the day from real open tasks, high priority first", () => {
    const res = ruleBasedReply("plan my day", ctx);
    expect(res.reply).toContain("Review pull requests");
    expect(res.reply.indexOf("Review pull requests")).toBeLessThan(res.reply.indexOf("Buy groceries"));
    expect(res.reply).toContain("1 overdue");
    expect(res.proposals).toHaveLength(0);
  });

  it("summarizes with real numbers only", () => {
    const res = ruleBasedReply("summarize my day", ctx);
    expect(res.reply).toContain("1 of 3 completed");
    expect(res.reply).toContain("7h"); // last night 420m
    expect(res.reply).toContain("Learn a new skill");
    expect(res.reply).toContain("25%");
  });

  it("always appends the general-guidance disclaimer for sleep topics", () => {
    const res = ruleBasedReply("how has my sleep been?", ctx);
    expect(res.reply).toMatch(/not medical advice|medical advice/i);
    expect(res.reply).toContain("7h"); // 420m last night
  });

  it("warnsSleep summary never claims quality", () => {
    const res = ruleBasedReply("how is my sleep", ctx);
    expect(res.reply).not.toMatch(/good sleep|bad sleep|sleep quality/i);
  });

  it("answers goal questions with computed progress", () => {
    const res = ruleBasedReply("how are my goals?", ctx);
    expect(res.reply).toContain("25%");
  });

  it("falls back to a capability list for unknown requests", () => {
    const res = ruleBasedReply("quantum chromodynamics?", ctx);
    expect(res.reply).toContain("Add a task to");
  });
});
