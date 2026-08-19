import { JudgeScore } from "@/lib/nomination-judging";
import * as XLSX from "xlsx";

interface JudgeReportData {
  participant: string;
  faculty: string;
  category: string;
  judge: string;
  score: number;
  submitted: string;
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

    // Sheet 1: Summary by Category
    const summaryData = categories.map((catName) => {
      const catScores = judgeScores.filter((s) => s.categoryName === catName);
      const judges = [...new Set(catScores.map((s) => s.judgeEmail))];
      const avgScore = catScores.length > 0 ? (catScores.reduce((a, b) => a + b.score, 0) / catScores.length).toFixed(2) : "N/A";

      return {
        Category: catName.toUpperCase(),
        "Total Scores": catScores.length,
        "Judges": judges.length,
        "Avg Score": avgScore,
      };
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Sheet 2: All scores detailed
    const detailedData: JudgeReportData[] = judgeScores
      .sort((a, b) => {
        if (a.categoryName !== b.categoryName) return a.categoryName.localeCompare(b.categoryName);
        if (a.nomineeName !== b.nomineeName) return a.nomineeName.localeCompare(b.nomineeName);
        return a.judgeEmail.localeCompare(b.judgeEmail);
      })
      .map((score) => {
        const nom = nominations.find((n) => n.id === score.nominationId);
        const submitted =
          score.updatedAt && typeof score.updatedAt === "object" && score.updatedAt.toDate
            ? score.updatedAt.toDate().toLocaleDateString("en-ZA")
            : "N/A";

        return {
          participant: score.nomineeName,
          faculty: nom?.faculty || "N/A",
          category: score.categoryName.toUpperCase(),
          judge: score.judgeEmail,
          score: score.score,
          submitted,
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
