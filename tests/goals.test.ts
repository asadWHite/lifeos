import { describe, expect, it } from "vitest";
import { computeGoalProgress } from "../src/lib/goals";

describe("computeGoalProgress", () => {
  it("uses an explicit measurable target when configured", () => {
    const p = computeGoalProgress(
      { metricTarget: 20, metricProgress: 5, metricUnit: "sessions" },
      [],
    );
    expect(p.kind).toBe("metric");
    expect(p.percent).toBe(25);
    expect(p.explanation).toContain("5 of 20 sessions");
  });

  it("caps metric progress at 100%", () => {
    const p = computeGoalProgress(
      { metricTarget: 10, metricProgress: 14, metricUnit: "days" },
      [],
    );
    expect(p.percent).toBe(100);
  });

  it("falls back to real task completion", () => {
    const p = computeGoalProgress(
      { metricTarget: null, metricProgress: 0, metricUnit: null },
      [{ status: "done" }, { status: "todo" }, { status: "todo" }],
    );
    expect(p.kind).toBe("tasks");
    expect(p.percent).toBe(33);
    expect(p.explanation).toContain("1 of 3");
  });

  it("never invents a percentage without measurable data", () => {
    const p = computeGoalProgress(
      { metricTarget: null, metricProgress: 0, metricUnit: null },
      [],
    );
    expect(p.kind).toBe("none");
    expect(p.percent).toBeNull();
    expect(p.explanation.toLowerCase()).toContain("no measurable progress");
  });

  it("metric target takes precedence over tasks", () => {
    const p = computeGoalProgress(
      { metricTarget: 4, metricProgress: 2, metricUnit: "chapters" },
      [{ status: "done" }],
    );
    expect(p.kind).toBe("metric");
    expect(p.percent).toBe(50);
  });
});
