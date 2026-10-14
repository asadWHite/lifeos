import { describe, expect, it } from "vitest";
import {
  EMPTY_VALUES,
  toggleDifficulty,
  validateStep,
} from "../src/lib/onboarding";

describe("validateStep", () => {
  it("requires an age group on step 0", () => {
    expect(validateStep(0, EMPTY_VALUES)).toMatch(/age group/i);
    expect(validateStep(0, { ...EMPTY_VALUES, ageGroup: "a25_34" })).toBeNull();
  });

  it("requires a life stage on step 1", () => {
    expect(validateStep(1, EMPTY_VALUES)).toMatch(/option/i);
    expect(validateStep(1, { ...EMPTY_VALUES, lifeStage: "retired" })).toBeNull();
  });

  it("validates schedule times only when provided (never forced)", () => {
    expect(validateStep(4, EMPTY_VALUES)).toBeNull();
    expect(validateStep(4, { ...EMPTY_VALUES, wakeTime: "07:30" })).toBeNull();
    expect(validateStep(4, { ...EMPTY_VALUES, wakeTime: "99:99" })).toMatch(/invalid/i);
  });

  it("optional steps always pass their minimum bar", () => {
    expect(validateStep(2, EMPTY_VALUES)).toBeNull();
    expect(validateStep(3, EMPTY_VALUES)).toBeNull();
    expect(validateStep(6, EMPTY_VALUES)).toBeNull();
    expect(validateStep(7, EMPTY_VALUES)).toBeNull();
  });
});

describe("toggleDifficulty", () => {
  it("makes “none of these” exclusive", () => {
    expect(toggleDifficulty(["starting", "focus"], "none")).toEqual(["none"]);
    expect(toggleDifficulty(["none"], "starting")).toEqual(["starting"]);
    expect(toggleDifficulty(["none"], "none")).toEqual([]);
  });
});
