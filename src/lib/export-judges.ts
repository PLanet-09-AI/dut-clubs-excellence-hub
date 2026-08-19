import { JudgeScore } from "@/lib/nomination-judging";
import * as XLSX from "xlsx";

interface JudgeReportData {
  participant: string;
  faculty: string;
  category: string;
  "Judge Breakdown"?: string;
  "Total Score"?: number;
  "Avg Score"?: string;
  "Last Updated"?: string;
}

/**
 * Export judge scores to Excel
 * Organized by category with multiple sheets for summary, details, and performance
 */
export function exportJudgesToExcel(judgeScores: JudgeScore[], nominations: any[]) {
  try {
    // Prepare data by category
    const categories = [...new Set(judgeScores.map((s) => s.categoryName))];
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary by Category with Judge Names
    const summaryData = categories.map((catName) => {
      const catScores = judgeScores.filter((s) => s.categoryName === catName);
      const judges = [...new Set(catScores.map((s) => s.judgeEmail))];
      const totalScore = catScores.reduce((a, b) => a + b.score, 0);
      const avgScore = catScores.length > 0 ? (totalScore / catScores.length).toFixed(2) : "N/A";

      return {
        Category: catName.toUpperCase(),
        "Total Scores": catScores.length,
        "Judge Names": judges.join("; "),
        "# Judges": judges.length,
        "Total Score": totalScore,
        "Avg Score": avgScore,
      };
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Sheet 2: All scores detailed - grouped by nominee to show judge contribution
    const scoresByNominee = {};
    for (const score of judgeScores) {
      const key = `${score.nominationId}|${score.nomineeName}|${score.categoryName}`;
      if (!scoresByNominee[key]) {
        scoresByNominee[key] = {
          nominationId: score.nominationId,
          nomineeName: score.nomineeName,
          categoryName: score.categoryName,
          judges: [],
          scores: [],
          submittedDates: []
        };
      }
      scoresByNominee[key].judges.push(score.judgeEmail);
      scoresByNominee[key].scores.push(score.score);
      const submitted =
        score.updatedAt && typeof score.updatedAt === "object" && score.updatedAt.toDate
          ? score.updatedAt.toDate().toLocaleDateString("en-ZA")
          : "N/A";
      scoresByNominee[key].submittedDates.push(submitted);
    }

    const detailedData: any[] = Object.values(scoresByNominee)
      .sort((a, b) => {
        if (a.categoryName !== b.categoryName) return a.categoryName.localeCompare(b.categoryName);
        return a.nomineeName.localeCompare(b.nomineeName);
      })
      .map((item) => {
        const nom = nominations.find((n) => n.id === item.nominationId);
        const totalScore = item.scores.reduce((a, b) => a + b, 0);
        const avgScore = (totalScore / item.scores.length).toFixed(2);

        return {
          participant: item.nomineeName,
          faculty: nom?.faculty || "N/A",
          category: item.categoryName.toUpperCase(),
          "Judge Breakdown": item.judges
            .map((j, i) => `${j} (${item.scores[i]})`)
            .join("; "),
          "Total Score": totalScore,
          "Avg Score": avgScore,
          "Last Updated": item.submittedDates[item.submittedDates.length - 1],
        };
      });

    const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(workbook, detailedSheet, "All Scores");

    // Sheet 3: Judge Performance
    const allJudges = [...new Set(judgeScores.map((s) => s.judgeEmail))];
    const performanceData = allJudges.map((judge) => {
      const judgeScores_ = judgeScores.filter((s) => s.judgeEmail === judge);
      const categories_ = [...new Set(judgeScores_.map((s) => s.categoryName))];
      const avgScore = (judgeScores_.reduce((a, b) => a + b.score, 0) / judgeScores_.length).toFixed(2);

      return {
        Judge: judge,
        "Scores Submitted": judgeScores_.length,
        "Avg Score": parseFloat(avgScore),
        "Categories": categories_.join(", "),
      };
    });

    const performanceSheet = XLSX.utils.json_to_sheet(performanceData);
    XLSX.utils.book_append_sheet(workbook, performanceSheet, "Judge Performance");

    // Save the workbook
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `judges-report-${timestamp}.xlsx`);

    return { success: true, message: `Report exported successfully as judges-report-${timestamp}.xlsx` };
  } catch (error) {
    console.error("Export failed:", error);
    return { success: false, message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

/**
 * Export judges data by category
 * Each category gets its own sheet with participant scores from all judges
 */
export function exportByCategory(judgeScores: JudgeScore[], nominations: any[]) {
  try {
    const categories = [...new Set(judgeScores.map((s) => s.categoryName))];
    const workbook = XLSX.utils.book_new();

    for (const catName of categories) {
      const catScores = judgeScores.filter((s) => s.categoryName === catName).sort((a, b) => a.nomineeName.localeCompare(b.nomineeName));

      const data = catScores.map((score) => {
        const nom = nominations.find((n) => n.id === score.nominationId);
        const submitted =
          score.updatedAt && typeof score.updatedAt === "object" && score.updatedAt.toDate
            ? score.updatedAt.toDate().toLocaleDateString("en-ZA")
            : "N/A";

        return {
          Participant: score.nomineeName,
          Faculty: nom?.faculty || "N/A",
          Judge: score.judgeEmail,
          Score: score.score,
          Submitted: submitted,
        };
      });

      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, catName.substring(0, 31)); // Excel sheet name max 31 chars
    }

    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `judges-by-category-${timestamp}.xlsx`);

    return { success: true, message: "Category report exported successfully" };
  } catch (error) {
    console.error("Export failed:", error);
    return { success: false, message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
