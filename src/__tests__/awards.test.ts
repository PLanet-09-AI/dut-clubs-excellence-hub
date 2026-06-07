/**
 * awards.ts — SOLID-principle unit tests
 *
 * SOLID mapping:
 *  S — each function tested in isolation (Single Responsibility)
 *  O — new criteria can be added without changing computeWeightedAverage (Open/Closed)
 *  L — getCriteriaForCategory returns same shape regardless of input (Liskov)
 *  I — EvaluationCriterion fields are all optional except id+label (Interface Segregation)
 *  D — computeWeightedAverage depends on the EvaluationCriterion abstraction, not a
 *      concrete array (Dependency Inversion)
 */

import { describe, it, expect } from "vitest";
import {
  getCriteriaForCategory,
  computeWeightedAverage,
  AWARD_CATEGORIES,
  type EvaluationCriterion,
} from "@/data/awards";

// ─── getCriteriaForCategory ───────────────────────────────────────────────────

describe("getCriteriaForCategory", () => {
  it("returns an array for every known category id", () => {
    for (const cat of AWARD_CATEGORIES) {
      const criteria = getCriteriaForCategory(cat.id);
      expect(Array.isArray(criteria)).toBe(true);
      expect(criteria.length).toBeGreaterThan(0);
    }
  });

  it("returns fallback criteria for an unknown id (Liskov — consistent return type)", () => {
    const criteria = getCriteriaForCategory("unknown-xyz");
    expect(Array.isArray(criteria)).toBe(true);
    expect(criteria.length).toBeGreaterThan(0);
  });

  it("returns fallback criteria when called with no argument", () => {
    const criteria = getCriteriaForCategory();
    expect(Array.isArray(criteria)).toBe(true);
    expect(criteria.length).toBeGreaterThan(0);
  });

  it("returns different criteria for dean vs sport (category-specific behaviour)", () => {
    const dean = getCriteriaForCategory("dean");
    const sport = getCriteriaForCategory("sport");
    // They should have different ids at minimum
    const deanIds = dean.map((c) => c.id).sort().join(",");
    const sportIds = sport.map((c) => c.id).sort().join(",");
    expect(deanIds).not.toBe(sportIds);
  });

  it("each criterion satisfies the EvaluationCriterion interface (id + label required)", () => {
    for (const cat of AWARD_CATEGORIES) {
      for (const c of getCriteriaForCategory(cat.id)) {
        expect(typeof c.id).toBe("string");
        expect(c.id.length).toBeGreaterThan(0);
        expect(typeof c.label).toBe("string");
        expect(c.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("all criterion ids within a category are unique (data integrity)", () => {
    for (const cat of AWARD_CATEGORIES) {
      const ids = getCriteriaForCategory(cat.id).map((c) => c.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });
});

// ─── computeWeightedAverage ───────────────────────────────────────────────────

describe("computeWeightedAverage", () => {
  const uniform: EvaluationCriterion[] = [
    { id: "a", label: "A", max: 5, weight: 1 },
    { id: "b", label: "B", max: 5, weight: 1 },
  ];

  it("returns 0 when no criteria are scored", () => {
    expect(computeWeightedAverage({}, uniform)).toBe(0);
  });

  it("returns 0 when all scores are 0", () => {
    expect(computeWeightedAverage({ a: 0, b: 0 }, uniform)).toBe(0);
  });

  it("returns 5 when all criteria are rated 5/5", () => {
    expect(computeWeightedAverage({ a: 5, b: 5 }, uniform)).toBe(5);
  });

  it("returns correct average for mixed scores (equal weights)", () => {
    // (3 + 5) / 2 = 4
    const result = computeWeightedAverage({ a: 3, b: 5 }, uniform);
    expect(result).toBeCloseTo(4, 5);
  });

  it("ignores criteria not in the scores object (partial scoring)", () => {
    // Only 'a' scored — result is based on 1 criterion
    const result = computeWeightedAverage({ a: 4 }, uniform);
    expect(result).toBeCloseTo(4, 5);
  });

  it("ignores scores for criteria ids not in the criteria array", () => {
    // Extra key 'z' should have no effect
    const result = computeWeightedAverage({ a: 4, z: 3 }, uniform);
    expect(result).toBeCloseTo(4, 5);
  });

  it("respects weights — higher-weight criterion pulls average more (Open/Closed)", () => {
    const weighted: EvaluationCriterion[] = [
      { id: "a", label: "A", max: 5, weight: 2 },
      { id: "b", label: "B", max: 5, weight: 1 },
    ];
    // a=5 (weight 2), b=2 (weight 1) → (5*2 + 2*1) / 3 = 12/3 = 4
    const result = computeWeightedAverage({ a: 5, b: 2 }, weighted);
    expect(result).toBeCloseTo(4, 5);
  });

  it("normalises non-5 max correctly — 3/3 max should equal 5 normalised", () => {
    const c: EvaluationCriterion[] = [{ id: "a", label: "A", max: 3, weight: 1 }];
    const result = computeWeightedAverage({ a: 3 }, c);
    expect(result).toBeCloseTo(5, 5);
  });

  it("returns value in 0–5 range for any valid input (boundary)", () => {
    for (const cat of AWARD_CATEGORIES) {
      const criteria = getCriteriaForCategory(cat.id);
      const full: Record<string, number> = {};
      const half: Record<string, number> = {};
      for (const c of criteria) {
        full[c.id] = c.max ?? 5;
        half[c.id] = Math.floor((c.max ?? 5) / 2);
      }
      expect(computeWeightedAverage(full, criteria)).toBeLessThanOrEqual(5);
      expect(computeWeightedAverage(full, criteria)).toBeGreaterThanOrEqual(0);
      expect(computeWeightedAverage(half, criteria)).toBeLessThanOrEqual(5);
      expect(computeWeightedAverage(half, criteria)).toBeGreaterThanOrEqual(0);
    }
  });

  it("is deterministic — same inputs always produce same output", () => {
    const scores = { a: 3, b: 4 };
    const r1 = computeWeightedAverage(scores, uniform);
    const r2 = computeWeightedAverage(scores, uniform);
    expect(r1).toBe(r2);
  });

  it("does not mutate the input criteriaScores object", () => {
    const scores = { a: 3, b: 4 };
    const copy = { ...scores };
    computeWeightedAverage(scores, uniform);
    expect(scores).toEqual(copy);
  });
});

// ─── AWARD_CATEGORIES data integrity ─────────────────────────────────────────

describe("AWARD_CATEGORIES data integrity", () => {
  it("all categories have a unique id", () => {
    const ids = AWARD_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all categories have at least one question", () => {
    for (const cat of AWARD_CATEGORIES) {
      expect(cat.questions.length).toBeGreaterThan(0);
    }
  });

  it("all question ids are unique within their category", () => {
    for (const cat of AWARD_CATEGORIES) {
      const qIds = cat.questions.map((q) => q.id);
      expect(new Set(qIds).size).toBe(qIds.length);
    }
  });

  it("question ids are globally unique across all categories (prevents scoring collisions)", () => {
    const allIds = AWARD_CATEGORIES.flatMap((c) => c.questions.map((q) => q.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("each category has name, short, tagline and description", () => {
    for (const cat of AWARD_CATEGORIES) {
      expect(cat.name.length).toBeGreaterThan(0);
      expect(cat.short.length).toBeGreaterThan(0);
      expect(cat.tagline.length).toBeGreaterThan(0);
      expect(cat.description.length).toBeGreaterThan(0);
    }
  });
});
