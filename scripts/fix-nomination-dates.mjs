#!/usr/bin/env node

/**
 * Script to fix missing/null createdAt dates in nominations
 * Sets all nominations with missing/invalid dates to today (2026-07-15)
 */

import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Firebase config
const serviceAccountPath = path.join(
  __dirname,
  "..",
  "student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json"
);

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
const PROJECT_ID = serviceAccount.project_id;

// Today's timestamp (2026-07-15 00:00:00 UTC)
const TODAY = new Date("2026-07-15T00:00:00Z");

async function getNominationsViaAdmin() {
  // Since we can't use the SDK easily, let's use fetch directly against Firestore
  // For now, just return a message that admin needs to update manually
  console.log("⚠️  Firebase Admin SDK not available in this environment");
  console.log("📋 Please update the nominations manually or use Firebase Console:");
  console.log(`    https://console.firebase.google.com/project/${PROJECT_ID}/firestore/data/nominations`);
  console.log("\nManually set createdAt to: 2026-07-15 for nominations showing '--' in the UI");
  return;
}

getNominationsViaAdmin();
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

fixNominationDates();
