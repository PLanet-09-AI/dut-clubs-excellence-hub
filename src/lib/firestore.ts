/**
 * Firestore helpers for the `past_winners` collection.
 *
 * Schema (each document in "past_winners"):
 *   id            string   – Firestore auto-id
 *   year          number   – award year (e.g. 2025)
 *   name          string   – winner / entity name
 *   categoryId    string   – matches AWARD_CATEGORIES id
 *   categoryName  string   – denormalised display name
 *   faculty       string   – faculty / campus (optional)
 *   programme     string   – study programme (optional)
 *   quote         string   – inspiring quote (optional)
 *   tier          "platinum"|"gold"|"silver"|"standard"
 *   imageBase64   string   – data URL (base64 encoded photo, optional)
 *   imageMimeType string   – e.g. "image/jpeg"
 *   nominationId  string   – link to source nomination (if promoted)
 *   createdAt     Timestamp
 *   updatedAt     Timestamp
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  getDocs,
  where,
  and,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PAST_WINNERS, AWARD_CATEGORIES } from "@/data/awards";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type WinnerTier = "platinum" | "gold" | "silver" | "standard";

export type PastWinner = {
  id: string;
  year: number;
  name: string;
  categoryId: string;
  categoryName: string;
  faculty?: string;
  programme?: string;
  quote?: string;
  tier: WinnerTier;
  imageBase64?: string;
  imageMimeType?: string;
  nominationId?: string;
  createdAt?: { toDate?: () => Date } | null;
  updatedAt?: { toDate?: () => Date } | null;
};

export type PastWinnerInput = Omit<PastWinner, "id" | "createdAt" | "updatedAt">;

const COL = "past_winners";

// ─── Subscribe (real-time) ─────────────────────────────────────────────────────

export function subscribePastWinners(callback: (winners: PastWinner[]) => void): () => void {
  const q = query(collection(db, COL), orderBy("year", "desc"));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PastWinner);
    callback(docs);
  });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addPastWinner(data: PastWinnerInput): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePastWinner(id: string, data: Partial<PastWinnerInput>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deletePastWinner(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

// ─── Promote from leaderboard ──────────────────────────────────────────────────

export async function promoteToWinner(opts: {
  nominationId: string;
  nomineeName: string;
  categoryId: string;
  categoryName: string;
  faculty?: string;
  year: number;
  tier: WinnerTier;
}): Promise<string> {
  return addPastWinner({
    year: opts.year,
    name: opts.nomineeName,
    categoryId: opts.categoryId,
    categoryName: opts.categoryName,
    faculty: opts.faculty,
    tier: opts.tier,
    nominationId: opts.nominationId,
  });
}

// ─── Seed (idempotent) ────────────────────────────────────────────────────────

/**
 * Seeds the static PAST_WINNERS array + 2025 SSA winners into Firestore.
 * Safe to call multiple times — checks for existing records by year + name + categoryId
 * before inserting.
 */
export async function seedPastWinners(): Promise<{ added: number; skipped: number }> {
  // Map category names to ids for the legacy records (which only have name).
  function catIdFromName(name: string): string {
    const match = AWARD_CATEGORIES.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() ||
             c.name.toLowerCase().includes(name.toLowerCase().split(" ")[0].toLowerCase())
    );
    return match?.id ?? name;
  }

  // Build full seed dataset.
  const seeds: PastWinnerInput[] = [
    // ── 2022–2024 from static array ──────────────────────────────────────────
    ...PAST_WINNERS.map((w) => ({
      year: w.year,
      name: w.name,
      categoryId: catIdFromName(w.category),
      categoryName: w.category,
      faculty: w.faculty,
      quote: w.quote,
      tier: "standard" as WinnerTier,
    })),

    // ── 2025 SSA Winners ─────────────────────────────────────────────────────
    // Outstanding Residence Life
    { year: 2025, name: "Liu KZN Properties (Tim's House) Residence", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "platinum" },
    { year: 2025, name: "Spare Investment Residence", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "gold" },
    { year: 2025, name: "Ashblock Residence", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "silver" },
    { year: 2025, name: "Big's Jo's Four Seasons", categoryId: "residence", categoryName: "Outstanding Residence Life Award", tier: "silver" },

    // Dean of Students Prestigious
    { year: 2025, name: "Luke Jaden Krishnan", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", programme: "Bachelor of Health Sciences in Radiotherapy", tier: "platinum" },
    { year: 2025, name: "Luyanda Zulu", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", programme: "Dip Info & Comm Tech in Business Analysis", tier: "gold" },
    { year: 2025, name: "Xoliso Dlamini", categoryId: "dean", categoryName: "Dean of Students Prestigious Award", programme: "Diploma in Management Sciences (Marketing)", tier: "silver" },

    // Exemplary Society/Club
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

  let added = 0;
  let skipped = 0;

  for (const seed of seeds) {
    // Idempotency check: look for existing doc with same year + name + categoryId.
    const existing = await getDocs(
      query(
        collection(db, COL),
        and(
          where("year", "==", seed.year),
          where("name", "==", seed.name),
          where("categoryId", "==", seed.categoryId),
        ),
      ),
    );
    if (!existing.empty) {
      skipped++;
      continue;
    }
    await addDoc(collection(db, COL), {
      ...seed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    added++;
  }

  return { added, skipped };
}
