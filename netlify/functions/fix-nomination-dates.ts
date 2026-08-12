import {
  initializeApp,
  cert,
  getApps,
} from "firebase-admin/app";
import {
  getFirestore,
  serverTimestamp,
  FieldValue,
} from "firebase-admin/firestore";
import type { Config } from "@netlify/functions";
import { getFirestoreDb } from "./firebase-admin-init";

const db = getFirestoreDb();

export default async (req: any) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const TODAY = new Date("2026-07-15");
    console.log(`[FIX_DATES] Starting to fix nomination dates...`);

    // Query all nominations
    const snapshot = await db.collection("nominations").get();

    if (snapshot.empty) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No nominations found" }),
      };
    }

    const toBeFix: Array<{ id: string; nominee: string }> = [];
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;

      // Check if createdAt is missing or invalid
      if (!createdAt) {
        console.log(`[FIX_DATES] Fixing: ${data.nomineeName}`);
        toBeFix.push({ id: doc.id, nominee: data.nomineeName });
        batch.update(doc.ref, {
          createdAt: serverTimestamp(),
        });
      }
    });

    if (toBeFix.length > 0) {
      console.log(`[FIX_DATES] Committing ${toBeFix.length} updates...`);
      await batch.commit();
      console.log(`[FIX_DATES] Updates complete`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          updated: toBeFix.length,
          nominations: toBeFix.map((n) => n.nominee),
        }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "No nominations with missing dates found",
        }),
      };
    }
  } catch (error) {
    console.error("[FIX_DATES] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export const config: Config = {
  path: "/fix-nomination-dates",
};
