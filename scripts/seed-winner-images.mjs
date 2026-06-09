/**
 * scripts/seed-winner-images.mjs
 *
 * Reads images from public/winners/ and updates matching past_winner documents
 * in Firestore with the base64-encoded image.
 *
 * Usage:
 *   node scripts/seed-winner-images.mjs
 *
 * Requires:
 *   GOOGLE_APPLICATION_CREDENTIALS env var (path to Firebase service account JSON)
 *   OR run `firebase login` and use Application Default Credentials.
 *
 * Image naming convention:
 *   {year}-{slug}.jpg   e.g. 2025-luke-jaden-krishnan.jpg
 *
 * The slug is matched against winner names by:
 *   1. Converting name to lowercase slug (letters, digits, hyphens only)
 *   2. Fuzzy-matching the image slug against each winner's slug
 *
 * Place images in:
 *   public/winners/
 *     2025-luke-jaden-krishnan.jpg
 *     2025-tims-house.jpg
 *     2025-spare-investment.jpg
 *     2025-ashblock.jpg
 *     2025-bigs-jos-four-seasons.jpg
 *     2025-luyanda-zulu.jpg
 *     2025-xoliso-dlamini.jpg
 *     2025-swda.jpg
 *     2025-ubuciko-bomlomo.jpg
 *     2025-saice-midlands.jpg
 *     2025-owethu-mhlongo.jpg
 *     2025-charlene-makwara.jpg
 *     2025-mihlali-mzilwa.jpg
 *     2025-reneilwe-masiavhula.jpg
 *     2025-imperial-residence.jpg
 *     2025-noluthando-dladla.jpg
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dir, "..");
const imgDir = join(rootDir, "public", "winners");

// ─── Firebase Admin init ───────────────────────────────────────────────────────
let app;
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credPath) {
  const credential = JSON.parse(readFileSync(credPath, "utf8"));
  app = initializeApp({ credential: cert(credential) });
} else {
  // Try Application Default Credentials
  app = initializeApp();
}

const db = getFirestore(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/['"()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mimeFromExt(ext) {
  const map = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
  return map[ext.toLowerCase()] ?? "image/jpeg";
}

function toBase64DataUrl(filePath) {
  const ext = extname(filePath);
  const mime = mimeFromExt(ext);
  const data = readFileSync(filePath).toString("base64");
  return { base64: `data:${mime};base64,${data}`, mime };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(imgDir)) {
    console.error(`Image directory not found: ${imgDir}`);
    console.error("Create public/winners/ and place images there first.");
    process.exit(1);
  }

  const imageFiles = readdirSync(imgDir).filter((f) =>
    [".jpg", ".jpeg", ".png", ".webp"].includes(extname(f).toLowerCase())
  );

  if (imageFiles.length === 0) {
    console.log("No images found in public/winners/. Nothing to do.");
    return;
  }

  console.log(`Found ${imageFiles.length} image(s) in public/winners/\n`);

  // Load all past_winners from Firestore
  const snap = await db.collection("past_winners").get();
  const winners = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`Loaded ${winners.length} past_winner documents from Firestore.\n`);

  let updated = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const file of imageFiles) {
    const name = basename(file, extname(file)); // e.g. "2025-luke-jaden-krishnan"
    const parts = name.match(/^(\d{4})-(.+)$/);
    if (!parts) {
      console.warn(`  SKIP  ${file} — does not match {year}-{slug}.ext format`);
      skipped++;
      continue;
    }
    const year = Number(parts[1]);
    const slug = parts[2];

    // Find best-matching winner (same year + slug fuzzy match)
    const candidate = winners.find((w) => {
      if (w.year !== year) return false;
      const winnerSlug = toSlug(w.name);
      // Accept if the image slug is a leading substring of the winner slug OR vice versa
      // Check slug words: all words in image slug appear in winner slug
      const slugWords = slug.split("-").filter(Boolean);
      const allWordsMatch = slugWords.every(w => winnerSlug.includes(w));
      return winnerSlug.startsWith(slug) || slug.startsWith(winnerSlug) || winnerSlug.includes(slug) || slug.includes(winnerSlug.slice(0, 8)) || allWordsMatch;
    });

    if (!candidate) {
      console.warn(`  NO MATCH  ${file} (year=${year}, slug=${slug})`);
      unmatched++;
      continue;
    }

    const filePath = join(imgDir, file);
    const { base64, mime } = toBase64DataUrl(filePath);
    const sizeMB = (readFileSync(filePath).length / 1_048_576).toFixed(2);

    if (readFileSync(filePath).length > 800_000) {
      console.warn(`  WARN  ${file} is ${sizeMB} MB — Firestore document limit is ~1 MB. Consider resizing.`);
    }

    await db.collection("past_winners").doc(candidate.id).update({
      imageBase64: base64,
      imageMimeType: mime,
      updatedAt: new Date(),
    });

    console.log(`  OK    ${file} → "${candidate.name}" (${year}) [${sizeMB} MB]`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}  Skipped: ${skipped}  Unmatched: ${unmatched}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
