import { JudgeScore } from "@/lib/nomination-judging";
import * as XLSX from "xlsx";

interface LeaderboardRow {
  rank: number;
  participant: string;
  faculty: string;
  "Total Score": number;
  "Avg Score": string;
  "Judge Breakdown": string;
}

interface NomineeWithScores {
  nominationId: string;
  nomineeName: string;
  categoryName: string;
  faculty?: string;
  judges: string[];
  scores: number[];
}

/**
 * Export leaderboard rankings by category
 * Each category gets its own sheet showing ranked nominees with judge scores
 */
export function exportLeaderboardByCategory(judgeScores: JudgeScore[], nominations: any[]) {
  try {
    console.log('[Export] Starting leaderboard by-category export with', judgeScores.length, 'scores');
    
    // Group scores by nomination to build nominees with totals
    const scoresByNominee = new Map<string, NomineeWithScores>();

    for (const score of judgeScores) {
      if (!score.score || score.score === 0) continue; // Skip unscored
      const key = `${score.nominationId}`;

      if (!scoresByNominee.has(key)) {
        const nom = nominations.find((n) => n.id === score.nominationId);
        scoresByNominee.set(key, {
          nominationId: score.nominationId,
          nomineeName: score.nomineeName,
          categoryName: score.categoryName,
          faculty: nom?.faculty || "N/A",
          judges: [],
          scores: [],
        });
      }

      const nominee = scoresByNominee.get(key)!;
      nominee.judges.push(score.judgeEmail);
      nominee.scores.push(score.score);
    }

    // Group by category and rank
    const byCategory = new Map<string, NomineeWithScores[]>();

    for (const nominee of scoresByNominee.values()) {
      if (!byCategory.has(nominee.categoryName)) {
        byCategory.set(nominee.categoryName, []);
      }
      byCategory.get(nominee.categoryName)!.push(nominee);
    }

    // Sort by total score descending within each category
    for (const nominees of byCategory.values()) {
      nominees.sort((a, b) => {
        const totalA = a.scores.reduce((x, y) => x + y, 0);
        const totalB = b.scores.reduce((x, y) => x + y, 0);
        return totalB - totalA;
      });
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add a summary sheet first
    const summaryData = Array.from(byCategory.entries()).map(([catName, nominees]) => ({
      Category: catName.toUpperCase(),
      "# Nominees": nominees.length,
      "Top Scorer": nominees[0]?.nomineeName || "N/A",
      "Top Score": nominees[0]
        ? (nominees[0].scores.reduce((a, b) => a + b, 0) / nominees[0].scores.length).toFixed(2)
        : "N/A",
    }));

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Add category sheets with rankings
    for (const [catName, nominees] of byCategory.entries()) {
      const data: LeaderboardRow[] = nominees.map((nominee, index) => {
        const totalScore = nominee.scores.reduce((a, b) => a + b, 0);
        const avgScore = (totalScore / nominee.scores.length).toFixed(2);

        return {
          rank: index + 1,
          participant: nominee.nomineeName,
          faculty: nominee.faculty,
          "Total Score": totalScore,
          "Avg Score": avgScore,
          "Judge Breakdown": nominee.judges
            .map((j, i) => `${j.split("@")[0]} (${nominee.scores[i]})`)
            .join("; "),
        };
      });

      const sheet = XLSX.utils.json_to_sheet(data);
      // Format rank column as numbers
      sheet["!autoFilter"] = { ref: `A1:F${data.length + 1}` };
      XLSX.utils.book_append_sheet(workbook, sheet, catName.substring(0, 31));
    }

    // Save the workbook
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `leaderboard-rankings-${timestamp}.xlsx`;
    console.log('[Export] Writing file:', filename);
    XLSX.writeFile(workbook, filename);
    console.log('[Export] File written successfully');

    return { success: true, message: `Leaderboard exported successfully as ${filename}` };
  } catch (error) {
    console.error("Export failed:", error);
    return { success: false, message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

/**
 * Export unified leaderboard across all categories
 * Shows all nominees ranked globally with category information
 */
export function exportLeaderboardUnified(judgeScores: JudgeScore[], nominations: any[]) {
  try {
    console.log('[Export] Starting unified leaderboard export with', judgeScores.length, 'scores');
    
    // Build all nominees with scores
    const scoresByNominee = new Map<string, NomineeWithScores>();

    for (const score of judgeScores) {
      if (!score.score || score.score === 0) continue;
      const key = `${score.nominationId}`;

      if (!scoresByNominee.has(key)) {
        const nom = nominations.find((n) => n.id === score.nominationId);
        scoresByNominee.set(key, {
          nominationId: score.nominationId,
          nomineeName: score.nomineeName,
          categoryName: score.categoryName,
          faculty: nom?.faculty || "N/A",
          judges: [],
          scores: [],
        });
      }

      const nominee = scoresByNominee.get(key)!;
      nominee.judges.push(score.judgeEmail);
      nominee.scores.push(score.score);
    }

    // Sort globally by total score
    const allNominees = Array.from(scoresByNominee.values()).sort((a, b) => {
      const totalA = a.scores.reduce((x, y) => x + y, 0);
      const totalB = b.scores.reduce((x, y) => x + y, 0);
      return totalB - totalA;
    });

    // Create data rows with global ranking
    const data = allNominees.map((nominee, index) => ({
      rank: index + 1,
      participant: nominee.nomineeName,
      category: nominee.categoryName.toUpperCase(),
      faculty: nominee.faculty,
      "Total Score": nominee.scores.reduce((a, b) => a + b, 0),
      "Avg Score": (nominee.scores.reduce((a, b) => a + b, 0) / nominee.scores.length).toFixed(2),
      "Judge Count": nominee.scores.length,
      "Judge Breakdown": nominee.judges
        .map((j, i) => `${j.split("@")[0]} (${nominee.scores[i]})`)
        .join("; "),
    }));

    // Create workbook with single sheet
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(data);
    sheet["!autoFilter"] = { ref: `A1:H${data.length + 1}` };
    XLSX.utils.book_append_sheet(workbook, sheet, "Global Rankings");

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `leaderboard-unified-${timestamp}.xlsx`;
    console.log('[Export] Writing file:', filename);
    XLSX.writeFile(workbook, filename);
    console.log('[Export] File written successfully');

    return { success: true, message: `Unified leaderboard exported successfully` };
  } catch (error) {
    console.error("Export failed:", error);
    return { success: false, message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
