/**
 * scripts/seed-winners.mjs
 *
 * Seeds all historical past winners (2022–2025) into Firestore.
 * Idempotent: skips docs that already exist (matches by year + name + categoryId).
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "path\to\serviceAccount.json"
 *   node scripts/seed-winners.mjs
 */

import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ─── Init ─────────────────────────────────────────────────────────────────────
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS before running this script.");
  process.exit(1);
}
const credential = JSON.parse(readFileSync(credPath, "utf8"));
initializeApp({ credential: cert(credential) });
const db = getFirestore();
const COL = "past_winners";

// ─── Seed data ────────────────────────────────────────────────────────────────
const seeds = [
  // ── 2022 ──────────────────────────────────────────────────────────────────
  { year: 2022, name: "Zinhle Buthelezi", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", faculty: "Engineering & Built Environment", quote: "Lead with the door open.", tier: "standard" },
  { year: 2022, name: "Lerato Mokoena", categoryId: "diversity", categoryName: "Diversity & Inclusion Award", faculty: "Arts & Design", quote: "Difference is our greatest design.", tier: "standard" },
  { year: 2022, name: "Kuda Moyo", categoryId: "entrepreneur", categoryName: "Student Entrepreneurship Award", faculty: "Applied Sciences", quote: "Knowledge is the only crown that doesn't tarnish.", tier: "standard" },
  { year: 2022, name: "Bongi Mthembu", categoryId: "sport", categoryName: "Sportsmanship Award", faculty: "Health Sciences", quote: "Strength is the smile after the struggle.", tier: "standard" },

  // ── 2023 ──────────────────────────────────────────────────────────────────
  { year: 2023, name: "Mandla Cele", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", faculty: "Management Sciences", quote: "We rise by lifting others.", tier: "standard" },
  { year: 2023, name: "Junior Ndlovu", categoryId: "entrepreneur", categoryName: "Student Entrepreneurship Award", faculty: "Management Sciences", quote: "Build small, build now, build true.", tier: "standard" },
  { year: 2023, name: "Priya Naidoo", categoryId: "emerging", categoryName: "Emerging Leader (First Year Student)", faculty: "Accounting & Informatics", quote: "Excellence is a habit, not an accident.", tier: "standard" },
  { year: 2023, name: "Andile Zungu", categoryId: "sport", categoryName: "Sportsmanship Award", faculty: "Applied Sciences", quote: "Every champion was once a beginner who refused to quit.", tier: "standard" },
  { year: 2023, name: "L Section Residence", categoryId: "residence", categoryName: "Outstanding Residence Life Award", faculty: "ML Sultan Campus", quote: "Care is the curriculum.", tier: "standard" },

  // ── 2024 ──────────────────────────────────────────────────────────────────
  // Promotion of Healthy Lifestyle
  { year: 2024, name: "Riashnie Thavier", categoryId: "wellness", categoryName: "Promotion of Healthy Lifestyle Award", tier: "standard" },
  // Sportsmanship
  { year: 2024, name: "Minenhle Ngubani", categoryId: "sport", categoryName: "Sportsmanship Award", tier: "platinum" },
  { year: 2024, name: "Thalente Hadebe", categoryId: "sport", categoryName: "Sportsmanship Award", tier: "gold" },
  // Exemplary Society/Club/Structure
  { year: 2024, name: "Green Campus Initiative", categoryId: "society", categoryName: "Exemplary Society/Club/Structure Award", tier: "platinum" },
  { year: 2024, name: "University of Life Changers", categoryId: "society", categoryName: "Exemplary Society/Club/Structure Award", tier: "gold" },
  { year: 2024, name: "South African Institution of Civil Engineering (SAICE)", categoryId: "society", categoryName: "Exemplary Society/Club/Structure Award", tier: "silver" },
  // Emerging Leader
  { year: 2024, name: "Mazomba Sesenkosi", categoryId: "emerging", categoryName: "Emerging Leader (First Year Student)", tier: "standard" },
  // Student Entrepreneurship
  { year: 2024, name: "Luyanda Majozi", categoryId: "entrepreneurship", categoryName: "Student Entrepreneurship Award", tier: "platinum" },
  { year: 2024, name: "Noluthando Zuma", categoryId: "entrepreneurship", categoryName: "Student Entrepreneurship Award", tier: "gold" },
  { year: 2024, name: "Sabelo Mpungose", categoryId: "entrepreneurship", categoryName: "Student Entrepreneurship Award", tier: "silver" },
  // Dean of Students Prestigious Award
  { year: 2024, name: "Lungelo Maphumulo", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", tier: "platinum" },
  { year: 2024, name: "Nonhlanhla Mkhwanazi", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", tier: "gold" },
  { year: 2024, name: "Riashnie Thavier", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", tier: "silver" },
  // Outstanding Residence Life
  { year: 2024, name: "Bayaphambili Residence", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "platinum" },
  { year: 2024, name: "Astra House", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "gold" },
  { year: 2024, name: "Hlelo Property 197 Anton Lembede", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "silver" },

  // ── 2025 SSA Winners ──────────────────────────────────────────────────────
  // Outstanding Residence Life
  { year: 2025, name: "Liu KZN Properties (Tim's House) Residence", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "platinum" },
  { year: 2025, name: "Spare Investment Residence", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "gold" },
  { year: 2025, name: "Ashblock Residence", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "silver" },
  { year: 2025, name: "Big's Jo's Four Seasons", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "silver" },

  // Dean of Students Prestigious
  { year: 2025, name: "Luke Jaden Krishnan", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", programme: "Bachelor of Health Sciences in Radiotherapy", tier: "platinum" },
  { year: 2025, name: "Luyanda Zulu", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", programme: "Dip Info & Comm Tech in Business Analysis", tier: "gold" },
  { year: 2025, name: "Xoliso Dlamini", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", programme: "Diploma in Management Sciences (Marketing)", tier: "silver" },

  // Exemplary Society / Club Structure
  { year: 2025, name: "Student with Disabilities Association (SWDA)", categoryId: "society", categoryName: "Exemplary Society/Club/Structure Award", tier: "platinum" },
  { year: 2025, name: "Ubuciko Bomlomo Ngamagama", categoryId: "society", categoryName: "Exemplary Society/Club/Structure Award", tier: "gold" },
  { year: 2025, name: "South African Institution of Civil Engineering (SAICE) - Midlands Campus", categoryId: "society", categoryName: "Exemplary Society/Club/Structure Award", tier: "silver" },

  // Student Entrepreneurship
  { year: 2025, name: "Owethu Sphesihle Mhlongo", categoryId: "entrepreneur", categoryName: "Student Entrepreneurship Award", programme: "Diploma in Management Sciences (Marketing)", tier: "platinum" },

  // Sportsmanship
  { year: 2025, name: 'Charlene "Chay" Makwara', categoryId: "sport", categoryName: "Sportsmanship Award", programme: "Bachelor Information & Comm Tech", tier: "platinum" },
  { year: 2025, name: "Mihlali Mzilwa", categoryId: "sport", categoryName: "Sportsmanship Award", programme: "BHSC in Diagnostic Radiography", tier: "gold" },
  { year: 2025, name: "Reneilwe Masiavhula", categoryId: "sport", categoryName: "Sportsmanship Award", programme: "Diploma in Information & Communication Technology in Business Analysis", tier: "silver" },

  // Diversity & Inclusion
  { year: 2025, name: "Imperial Residence", categoryId: "diversity", categoryName: "Diversity & Inclusion Award", tier: "platinum" },

  // Emerging Leader
  { year: 2025, name: "Noluthando Happiness Dladla", categoryId: "emerging", categoryName: "Emerging Leader (First Year Student)", programme: "Diploma in Drama", tier: "silver" },
];

// ─── Run ──────────────────────────────────────────────────────────────────────
let added = 0;
let skipped = 0;

for (const seed of seeds) {
  const snap = await db
    .collection(COL)
    .where("year", "==", seed.year)
    .where("name", "==", seed.name)
    .where("categoryId", "==", seed.categoryId)
    .get();

  if (!snap.empty) {
    console.log(`  SKIP   [${seed.year}] ${seed.name}`);
    skipped++;
    continue;
  }

  // Remove undefined fields before writing
  const doc = Object.fromEntries(
    Object.entries({ ...seed, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
      .filter(([, v]) => v !== undefined)
  );

  await db.collection(COL).add(doc);
  console.log(`  ADDED  [${seed.year}] ${seed.tier.toUpperCase()} — ${seed.name}`);
  added++;
}

console.log(`\nDone. Added: ${added}  Skipped: ${skipped}`);
process.exit(0);
