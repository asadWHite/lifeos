import { describe, expect, it } from "vitest";
import { personalize, type PersonalizationInput } from "../src/lib/personalization";

const base: PersonalizationInput = {
  ageGroup: "a25_34",
  lifeStage: "employed",
  interests: ["technology"],
  objectives: [],
  planningStyle: "together",
  difficulties: [],
  personalTime: "evening",
  sleepTargetMinutes: null,
};

describe("personalize", () => {
  it("creates objective-driven starter tasks for a sleep-focused user", () => {
    const plan = personalize({ ...base, objectives: ["sleep"] });
    expect(plan.starterTasks.some((t) => /wind/i.test(t.title))).toBe(true);
    expect(plan.emphasizeSleep).toBe(true);
    expect(plan.suggestedGoal?.category).toBe("health");
    expect(plan.insights.some((i) => /not medical advice/i.test(i))).toBe(true);
  });

  it("scales the plan to the planning preference", () => {
    const independent = personalize({ ...base, objectives: ["skills", "activity", "sleep"], planningStyle: "independent" });
    expect(independent.starterTasks.length).toBe(1);
    const full = personalize({ ...base, objectives: ["skills", "activity", "sleep"], planningStyle: "full_plan" });
    expect(full.starterTasks.length).toBe(3);
  });

  it("never leaves the plan empty", () => {
    const plan = personalize({ ...base, objectives: [] });
    expect(plan.starterTasks.length).toBeGreaterThan(0);
  });

  it("adds a study prompt for students without stereotyping others", () => {
    const student = personalize({ ...base, lifeStage: "university" });
    expect(student.quickPrompts).toContain("Help me schedule study time");
    const employed = personalize({ ...base, lifeStage: "employed" });
    expect(employed.quickPrompts).not.toContain("Help me schedule study time");
  });

  it("creates no goal when objectives don't map to one", () => {
    const plan = personalize({ ...base, objectives: [] });
    expect(plan.suggestedGoal).toBeNull();
  });
});
