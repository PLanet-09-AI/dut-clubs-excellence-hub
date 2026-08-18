/**
 * Nomination Judging Status Helpers
 * 
 * Tracks whether a nomination's judging is complete or pending based on:
 * - How many judges are "active" (have submitted at least one score to the system)
 * - Which judges have completed scores for this specific nomination (all criteria rated)
 */

import { getCriteriaForCategory } from "@/data/awards";

export type JudgeScore = {
  nominationId: string;
  judgeUid: string;
  judgeEmail: string;
  nomineeName: string;
  categoryName: string;
  score: number;
  criteriaScores?: Record<string, number>;
  comment: string;
  updatedAt: { toDate?: () => Date } | null;
};

/**
 * Determines if a judge's score for a nomination is "complete"
 * A score is complete if the judge has started scoring (has a non-zero score value)
 * Missing individual criteria are treated as 0 for calculation purposes
 */
export function isJudgeScoreComplete(
  judgeScore: JudgeScore | undefined,
  categoryId: string,
): boolean {
  if (!judgeScore) return false;
  
  // If they have any score value > 0, they started judging - count as complete
  // Individual missing criteria will be treated as 0 in calculations
  return judgeScore.score > 0;
}

/**
 * Counts how many judges have completed scores for a specific nomination
 * A completed score means all criteria for that nomination are rated
 */
export function getCompletedJudgeCount(
  nominationId: string,
  allJudgeScores: JudgeScore[],
  categoryId: string,
): number {
  return allJudgeScores
    .filter((score) => score.nominationId === nominationId)
    .filter((score) => isJudgeScoreComplete(score, categoryId)).length;
}

/**
 * Counts how many judges are "active" in the system (have submitted at least one score)
 */
export function getActivejudgeCount(allJudgeScores: JudgeScore[]): number {
  const activeJudges = new Set(allJudgeScores.map((score) => score.judgeUid));
  return activeJudges.size;
}

/**
 * Determines the judging status for a nomination
 * Returns: "complete" if all active judges have completed scores, "pending" otherwise
 */
export function getNominationJudgingStatus(
  nominationId: string,
  categoryId: string,
  allJudgeScores: JudgeScore[],
): "complete" | "pending" {
  const activeJudges = getActivejudgeCount(allJudgeScores);
  const completedJudges = getCompletedJudgeCount(nominationId, allJudgeScores, categoryId);
  
  const status = activeJudges > 0 && completedJudges === activeJudges ? "complete" : "pending";
  
  // Debug logging for pending nominations
  if (status === "pending") {
    const nomScores = allJudgeScores.filter(s => s.nominationId === nominationId);
    const missingJudges = nomScores
      .filter(s => {
        const complete = isJudgeScoreComplete(s, categoryId);
        return !complete;
      })
      .map(s => s.judgeEmail);
    
    console.log(`[JUDGING] ${nominationId} - PENDING: ${completedJudges}/${activeJudges} judges complete. Missing: ${missingJudges.join(', ')}`);
  }
  
  return status;
}

/**
 * Gets detailed judging information for a nomination
 * Useful for displaying progress indicators
 */
export function getJudgingDetails(
  nominationId: string,
  categoryId: string,
  allJudgeScores: JudgeScore[],
) {
  const activeJudgeCount = getActivejudgeCount(allJudgeScores);
  const completedCount = getCompletedJudgeCount(nominationId, allJudgeScores, categoryId);
  const status = getNominationJudgingStatus(nominationId, categoryId, allJudgeScores);
  
  return {
    status,
    activeJudges: activeJudgeCount,
    completedJudges: completedCount,
    pendingJudges: activeJudgeCount - completedCount,
    isComplete: status === "complete",
  };
}

/**
 * Gets judge-by-judge breakdown for a specific nomination
 * Shows which judges have completed scores and which are pending
 */
export function getJudgeBreakdown(
  nominationId: string,
  categoryId: string,
  allJudgeScores: JudgeScore[],
) {
  // Get all active judges (by unique uid)
  const activeJudgesMap = new Map<string, { uid: string; email: string }>();
  allJudgeScores.forEach((score) => {
    if (!activeJudgesMap.has(score.judgeUid)) {
      activeJudgesMap.set(score.judgeUid, {
        uid: score.judgeUid,
        email: score.judgeEmail,
      });
    }
  });

  // For each active judge, check if they have a complete score for this nomination
  const breakdown = Array.from(activeJudgesMap.values()).map((judge) => {
    const judgeScore = allJudgeScores.find(
      (s) => s.nominationId === nominationId && s.judgeUid === judge.uid
    );
    const isComplete = isJudgeScoreComplete(judgeScore, categoryId);
    
    return {
      judgeUid: judge.uid,
      judgeEmail: judge.email,
      hasSubmittedScore: !!judgeScore,
      isComplete,
      score: judgeScore?.score ?? null,
      updatedAt: judgeScore?.updatedAt ?? null,
    };
  });

  return breakdown.sort((a, b) => {
    // Sort: completed first, then pending
    if (a.isComplete && !b.isComplete) return -1;
    if (!a.isComplete && b.isComplete) return 1;
    // Then alphabetically by email
    return a.judgeEmail.localeCompare(b.judgeEmail);
  });
}
