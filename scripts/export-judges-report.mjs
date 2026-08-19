#!/usr/bin/env node

/**
 * Export judges data to Excel workbook
 * Organized by category showing judge scores and participant details
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase-admin/firestore";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const serviceAccountPath = "./student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json";
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

// Define award categories
const CATEGORIES = [
  "dean",
  "emerging",
  "sport",
  "society",
  "diversity",
  "residence",
  "entrepreneur",
  "wellness",
];

const CATEGORY_NAMES = {
  dean: "Dean of Students Prestigious Award",
  emerging: "Emerging Leader (First Year Student)",
  sport: "Sportsmanship Award",
  society: "Exemplary Society/Club/Structure Award",
  diversity: "Diversity & Inclusion Award",
  residence: "Outstanding Residence Life Award",
  entrepreneur: "Student Entrepreneurship Award",
  wellness: "Promotion of Healthy Lifestyle Award",
};

async function exportJudgesReport() {
  try {
    console.log("📊 Exporting judges report to Excel...\n");

    // Fetch all judge scores
    const scoresQ = query(collection(db, "judge_scores"), orderBy("categoryId", "asc"));
    const scoresDocs = await getDocs(scoresQ);
    const allScores = scoresDocs.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Fetch all nominations
    const nomQ = query(collection(db, "nominations"), orderBy("categoryId", "asc"));
    const nomDocs = await getDocs(nomQ);
    const nominations = nomDocs.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary by Category
    const summarySheet = workbook.addWorksheet("Summary by Category");
    summarySheet.columns = [
      { header: "Category", key: "category", width: 35 },
      { header: "Total Nominees", key: "totalNominees", width: 18 },
      { header: "Judges", key: "judges", width: 25 },
      { header: "Total Scores", key: "totalScores", width: 15 },
      { header: "Avg Score", key: "avgScore", width: 15 },
    ];

    // Add header styling
    summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    summarySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0066CC" } };

    // Process each category
    for (const catId of CATEGORIES) {
      const catScores = allScores.filter((s) => s.categoryId === catId);
      const catNoms = nominations.filter((n) => n.categoryId === catId);
      const judges = [...new Set(catScores.map((s) => s.judgeEmail))];
      const avgScore = catScores.length > 0 ? (catScores.reduce((a, b) => a + b.score, 0) / catScores.length).toFixed(2) : "N/A";

      summarySheet.addRow({
        category: CATEGORY_NAMES[catId] || catId,
        totalNominees: catNoms.length,
        judges: judges.join(", "),
        totalScores: catScores.length,
        avgScore,
      });
    }

    // Sheet 2: Detailed Scores by Category
    for (const catId of CATEGORIES) {
      const catScores = allScores.filter((s) => s.categoryId === catId);
      const categoryName = CATEGORY_NAMES[catId] || catId;

      if (catScores.length === 0) continue;

      const sheet = workbook.addWorksheet(categoryName.substring(0, 30));

      sheet.columns = [
        { header: "Participant", key: "participant", width: 25 },
        { header: "Faculty", key: "faculty", width: 20 },
        { header: "Judge", key: "judge", width: 25 },
        { header: "Score", key: "score", width: 10 },
        { header: "Submitted", key: "submitted", width: 18 },
      ];

      // Header styling
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0066CC" } };

      // Sort by participant name then judge
      const sorted = catScores.sort((a, b) => {
        if (a.nomineeName !== b.nomineeName) {
          return a.nomineeName.localeCompare(b.nomineeName);
        }
        return a.judgeEmail.localeCompare(b.judgeEmail);
      });

      for (const score of sorted) {
        const nom = nominations.find((n) => n.id === score.nominationId);
        const submitted =
          score.updatedAt && typeof score.updatedAt === "object" && score.updatedAt.toDate
            ? score.updatedAt.toDate().toLocaleDateString("en-ZA")
            : "N/A";

        sheet.addRow({
          participant: score.nomineeName,
          faculty: nom?.faculty || "N/A",
          judge: score.judgeEmail,
          score: score.score.toFixed(2),
          submitted,
        });
      }

      // Format numbers
      sheet.getColumn("score").numFmt = "0.00";
    }

    // Sheet 3: Judge Performance
    const performanceSheet = workbook.addWorksheet("Judge Performance");
    performanceSheet.columns = [
      { header: "Judge", key: "judge", width: 25 },
      { header: "Scores Submitted", key: "count", width: 18 },
      { header: "Avg Score Given", key: "avgScore", width: 18 },
      { header: "Categories Judged", key: "categories", width: 35 },
      { header: "Last Submitted", key: "lastSubmitted", width: 18 },
    ];

    performanceSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    performanceSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0066CC" } };

    const judges = [...new Set(allScores.map((s) => s.judgeEmail))];
    for (const judge of judges.sort()) {
      const judgeScores = allScores.filter((s) => s.judgeEmail === judge);
      const categories = [...new Set(judgeScores.map((s) => CATEGORY_NAMES[s.categoryId] || s.categoryId))];
      const avgScore = (judgeScores.reduce((a, b) => a + b.score, 0) / judgeScores.length).toFixed(2);
      const lastSubmitted =
        judgeScores.length > 0 && judgeScores[0].updatedAt && typeof judgeScores[0].updatedAt === "object" && judgeScores[0].updatedAt.toDate
          ? judgeScores[0].updatedAt.toDate().toLocaleDateString("en-ZA")
          : "N/A";

      performanceSheet.addRow({
        judge,
        count: judgeScores.length,
        avgScore,
        categories: categories.join("; "),
        lastSubmitted,
      });
    }

    performanceSheet.getColumn("avgScore").numFmt = "0.00";

    // Save file
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `judges-report-${timestamp}.xlsx`;
    await workbook.xlsx.writeFile(filename);

    console.log(`✅ Report exported successfully!\n`);
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Sheets created:`);
    console.log(`   • Summary by Category`);
    console.log(`   • Detailed scores for ${CATEGORIES.filter((c) => allScores.some((s) => s.categoryId === c)).length} categories`);
    console.log(`   • Judge Performance metrics\n`);
    console.log(`📈 Statistics:`);
    console.log(`   • Total scores: ${allScores.length}`);
    console.log(`   • Judges: ${judges.length}`);
    console.log(`   • Categories: ${[...new Set(allScores.map((s) => s.categoryId))].length}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

exportJudgesReport();
