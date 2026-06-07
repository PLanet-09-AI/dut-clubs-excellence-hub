/**
 * Leaderboard aggregation logic — SOLID-principle unit tests
 *
 * The aggregation logic lives in LeaderboardContent.useMemo inside leaderboard.tsx.
 * To keep it testable without React/Firestore, these tests extract and verify the
 * same algorithm as pure functions (S — single responsibility per function).
 */
import { describe, it, expect } from "vitest";
import { AWARD_CATEGORIES, getCriteriaForCategory } from "@/data/awards";

// ─── Pure helpers mirrored from LeaderboardContent ──────────────────────────

type JudgeScoreDoc = {
  nominationId: string;
  nomineeName: string;
  categoryName: string;
  categoryId?: string;
  score: number;
  criteriaScores?: Record<string, number>;
};

type NomineeEntry = {
  nominationId: string;
  nomineeName: string;
  categoryId: string;
  categoryName: string;
  scores: number[];
  totalScore: number;
  avgScore: number;
  judgeCount: number;
  criteriaTotals: Record<string, { sum: number; count: number }>;
};

function buildNomineeMap(allScores: JudgeScoreDoc[]): Map<string, NomineeEntry> {
  const nomineeMap = new Map<string, NomineeEntry>();

  for (const s of allScores) {
    if (s.score === 0) continue;
    const key = s.nominationId;
    if (!nomineeMap.has(key)) {
      const catMatch = AWARD_CATEGORIES.find((c) => c.name === s.categoryName);
      nomineeMap.set(key, {
        nominationId: key,
        nomineeName: s.nomineeName,
        categoryId: s.categoryId ?? catMatch?.id ?? s.categoryName,
        categoryName: s.categoryName,
        scores: [],
        totalScore: 0,
        avgScore: 0,
        judgeCount: 0,
        criteriaTotals: {},
      });
    }
    const entry = nomineeMap.get(key)!;
    entry.scores.push(s.score);
    entry.totalScore = entry.scores.reduce((a, b) => a + b, 0);
    entry.avgScore = entry.totalScore / entry.scores.length;
    entry.judgeCount = entry.scores.length;

    if (s.criteriaScores) {
      for (const [critId, value] of Object.entries(s.criteriaScores)) {
        if (typeof value !== "number" || value <= 0) continue;
        const totals = entry.criteriaTotals[critId] ?? { sum: 0, count: 0 };
        totals.sum += value;
        totals.count += 1;
        entry.criteriaTotals[critId] = totals;
      }
    }
  }
  return nomineeMap;
}

function rankNominees(entries: NomineeEntry[]): NomineeEntry[] {
  return [...entries].sort((a, b) => b.totalScore - a.totalScore || b.avgScore - a.avgScore);
}

// ─── buildNomineeMap ──────────────────────────────────────────────────────────

describe("buildNomineeMap", () => {
  it("returns empty map for empty scores array", () => {
    expect(buildNomineeMap([]).size).toBe(0);
  });

  it("skips score=0 entries (unscored)", () => {
    const map = buildNomineeMap([
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 0 },
    ]);
    expect(map.size).toBe(0);
  });

  it("creates one entry per unique nominationId", () => {
    const map = buildNomineeMap([
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 4 },
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 3 },
      { nominationId: "n2", nomineeName: "Bob", categoryName: "Dean", score: 5 },
    ]);
    expect(map.size).toBe(2);
  });

  it("accumulates scores from multiple judges correctly", () => {
    const map = buildNomineeMap([
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 4 },
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 2 },
    ]);
    const entry = map.get("n1")!;
    expect(entry.judgeCount).toBe(2);
    expect(entry.totalScore).toBeCloseTo(6);
    expect(entry.avgScore).toBeCloseTo(3);
  });

  it("correctly accumulates criteriaScores across multiple judges", () => {
    const map = buildNomineeMap([
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 4, criteriaScores: { "academic": 4, "leadership": 3 } },
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 5, criteriaScores: { "academic": 5 } },
    ]);
    const entry = map.get("n1")!;
    expect(entry.criteriaTotals["academic"].sum).toBeCloseTo(9);
    expect(entry.criteriaTotals["academic"].count).toBe(2);
    expect(entry.criteriaTotals["leadership"].sum).toBeCloseTo(3);
    expect(entry.criteriaTotals["leadership"].count).toBe(1);
  });

  it("ignores criteriaScore values that are 0 or negative", () => {
    const map = buildNomineeMap([
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 3, criteriaScores: { "academic": 0, "leadership": -1 } },
    ]);
    const entry = map.get("n1")!;
    expect(Object.keys(entry.criteriaTotals).length).toBe(0);
  });

  it("resolves categoryId from AWARD_CATEGORIES by name when not provided", () => {
    const cat = AWARD_CATEGORIES[0];
    const map = buildNomineeMap([
      { nominationId: "n1", nomineeName: "Alice", categoryName: cat.name, score: 3 },
    ]);
    expect(map.get("n1")!.categoryId).toBe(cat.id);
  });

  it("uses provided categoryId over name-lookup", () => {
    const map = buildNomineeMap([
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", categoryId: "custom-id", score: 3 },
    ]);
    expect(map.get("n1")!.categoryId).toBe("custom-id");
  });

  it("does not mutate the input scores array", () => {
    const scores = [
      { nominationId: "n1", nomineeName: "Alice", categoryName: "Dean", score: 4 },
    ];
    const copy = JSON.stringify(scores);
    buildNomineeMap(scores);
    expect(JSON.stringify(scores)).toBe(copy);
  });
});

// ─── rankNominees ─────────────────────────────────────────────────────────────

describe("rankNominees", () => {
  function makeEntry(id: string, total: number, avg: number): NomineeEntry {
    return {
      nominationId: id,
      nomineeName: id,
      categoryId: "dean",
      categoryName: "Dean",
      scores: [],
      totalScore: total,
      avgScore: avg,
      judgeCount: 1,
      criteriaTotals: {},
    };
  }

  it("ranks by totalScore descending", () => {
    const ranked = rankNominees([makeEntry("a", 10, 4), makeEntry("b", 15, 3)]);
    expect(ranked[0].nominationId).toBe("b");
    expect(ranked[1].nominationId).toBe("a");
  });

  it("breaks ties by avgScore descending", () => {
    const ranked = rankNominees([makeEntry("a", 10, 3.5), makeEntry("b", 10, 4.0)]);
    expect(ranked[0].nominationId).toBe("b");
  });

  it("returns empty array for empty input", () => {
    expect(rankNominees([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const entries = [makeEntry("a", 10, 4), makeEntry("b", 15, 3)];
    const originalFirst = entries[0].nominationId;
    rankNominees(entries);
    expect(entries[0].nominationId).toBe(originalFirst);
  });

  it("single entry is ranked first", () => {
    const ranked = rankNominees([makeEntry("solo", 8, 4)]);
    expect(ranked[0].nominationId).toBe("solo");
  });
});

// ─── Per-category criteria for breakdown display ──────────────────────────────

describe("CriteriaBreakdown label resolution (getCriteriaForCategory)", () => {
  it("returns criteria with labels for all categories in AWARD_CATEGORIES", () => {
    for (const cat of AWARD_CATEGORIES) {
      const criteria = getCriteriaForCategory(cat.id);
      expect(criteria.length).toBeGreaterThan(0);
      for (const c of criteria) {
        expect(c.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("criteria ids returned match what criteriaTotals keys would be stored as", () => {
    // Simulate a judge scoring with the first criterion id for each category
    for (const cat of AWARD_CATEGORIES) {
      const criteria = getCriteriaForCategory(cat.id);
      const firstId = criteria[0].id;
      const map = buildNomineeMap([{
        nominationId: "x",
        nomineeName: "Test",
        categoryName: cat.name,
        categoryId: cat.id,
        score: 3,
        criteriaScores: { [firstId]: 3 },
      }]);
      const entry = map.get("x")!;
      expect(entry.criteriaTotals[firstId]).toBeDefined();
      expect(entry.criteriaTotals[firstId].count).toBe(1);
    }
  });
});
