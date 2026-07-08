#!/usr/bin/env node

/**
 * Standalone Script: Merge Corrupted Nominations
 * 
 * This script merges files from corrupted nomination documents into their
 * matching clean versions, then removes the corrupted records.
 * 
 * Usage:
 *   node scripts/merge-corrupted-nominations.js report [--dry-run]
 *   node scripts/merge-corrupted-nominations.js merge [--dry-run]
 * 
 * Examples:
 *   node scripts/merge-corrupted-nominations.js report          # Preview what will be merged
 *   node scripts/merge-corrupted-nominations.js merge --dry-run # Dry run (simulate merge)
 *   node scripts/merge-corrupted-nominations.js merge           # Actually perform merge
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);

// Get command line arguments
const args = process.argv.slice(2);
const action = args[0] || 'report'; // 'report' or 'merge'
const dryRun = args.includes('--dry-run');

if (!['report', 'merge'].includes(action)) {
  console.error('❌ Invalid action. Use "report" or "merge"');
  process.exit(1);
}

console.log(`\n🔄 Starting merge operation...`);
console.log(`   Action: ${action}`);
console.log(`   Dry Run: ${dryRun}\n`);

// Initialize Firebase
try {
  // Try to load from environment variable first
  let serviceAccount;
  
  if (process.env.FIREBASE_ADMIN_SDK_B64) {
    serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_ADMIN_SDK_B64, 'base64').toString()
    );
  } else {
    // Try to load from file
    const credPath = path.join(__dirname, '../student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json');
    if (fs.existsSync(credPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    } else {
      throw new Error(
        'Firebase credentials not found. Set FIREBASE_ADMIN_SDK_B64 env var or place credentials in project root'
      );
    }
  }

  initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore();

  function isCorrupted(data) {
    const requiredFields = [
      'nomineeName',
      'nomineeEmail',
      'studentNumber',
      'categoryId'
    ];

    for (const field of requiredFields) {
      if (!data[field]) return true;
    }

    const dataStr = JSON.stringify(data);
    if (dataStr.includes('[object Object]')) return true;

    if (typeof data.nomineeName === 'object' && data.nomineeName !== null) return true;
    if (typeof data.nomineeEmail === 'object' && data.nomineeEmail !== null) return true;
    if (typeof data.studentNumber === 'object' && data.studentNumber !== null) return true;

    return false;
  }

  function mergeUploads(targetUploads = {}, sourceUploads = {}) {
    const result = JSON.parse(JSON.stringify(targetUploads));
    const summary = {};

    for (const questionId in sourceUploads) {
      const sourceSlots = sourceUploads[questionId];

      if (!result[questionId]) {
        result[questionId] = {};
      }

      let questionFileCount = 0;

      for (const slotKey in sourceSlots) {
        const sourceFiles = sourceSlots[slotKey];

        if (Array.isArray(sourceFiles) && sourceFiles.length > 0) {
          if (!result[questionId][slotKey]) {
            result[questionId][slotKey] = [];
          }

          const existingNames = new Set(
            result[questionId][slotKey].map((f) => f.name || f)
          );

          for (const file of sourceFiles) {
            const fileName = file.name || file;
            if (!existingNames.has(fileName)) {
              result[questionId][slotKey].push(file);
              questionFileCount++;
            }
          }
        }
      }

      if (questionFileCount > 0) {
        summary[questionId] = questionFileCount;
      }
    }

    return { merged: result, summary };
  }

  // Main execution
  const snapshot = await db.collection('nominations').get();
  console.log(`📊 Found ${snapshot.size} total nominations\n`);

  const corruptedDocs = new Map();
  const cleanDocs = new Map();

  // Categorize
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (isCorrupted(data)) {
      corruptedDocs.set(doc.id, { data, ref: doc.ref });
    } else {
      const key = `${data.nomineeEmail?.toLowerCase()}_${data.categoryId}`;
      cleanDocs.set(key, { id: doc.id, data, ref: doc.ref });
    }
  }

  console.log(`⚠️  Corrupted nominations: ${corruptedDocs.size}`);
  console.log(`✅ Clean nominations: ${cleanDocs.size}\n`);

  if (corruptedDocs.size === 0) {
    console.log('🎉 No corrupted nominations found!\n');
    process.exit(0);
  }

  const merges = [];
  let totalFilesMerged = 0;

  // Find matches and prepare merges
  for (const [corruptedId, { data: corruptedData }] of corruptedDocs) {
    const matchKey = `${corruptedData.nomineeEmail?.toLowerCase()}_${corruptedData.categoryId}`;
    const cleanMatch = cleanDocs.get(matchKey);

    if (cleanMatch) {
      const { merged, summary } = mergeUploads(
        cleanMatch.data.uploads || {},
        corruptedData.uploads || {}
      );

      const filesMerged = Object.values(summary).reduce((a, b) => a + b, 0);
      totalFilesMerged += filesMerged;

      console.log(`🔄 Match found: ${corruptedId}`);
      console.log(`   → Clean doc: ${cleanMatch.id}`);
      console.log(`   → Nominee: ${cleanMatch.data.nomineeName}`);
      console.log(`   → Files to merge: ${filesMerged}`);
      console.log(`   → Questions: ${JSON.stringify(summary)}\n`);

      merges.push({
        corruptedId,
        cleanId: cleanMatch.id,
        filesMerged,
        uploadsMerged: summary,
        merged,
        cleanRef: cleanMatch.ref,
        corruptedRef: corruptedDocs.get(corruptedId).ref
      });
    } else {
      console.log(`⚠️  No match found for corrupted doc: ${corruptedId}`);
      console.log(`   → Email: ${corruptedData.nomineeEmail}`);
      console.log(`   → Category: ${corruptedData.categoryId}\n`);

      merges.push({
        corruptedId,
        cleanId: 'NO_MATCH',
        filesMerged: 0,
        uploadsMerged: {},
        merged: null,
        cleanRef: null,
        corruptedRef: corruptedDocs.get(corruptedId).ref
      });
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`   Total files to merge: ${totalFilesMerged}`);
  console.log(`   Merges to perform: ${merges.length}`);
  console.log(`   Dry run: ${dryRun}\n`);

  if (action === 'report' || dryRun) {
    console.log('✓ Preview complete. No changes made.\n');
    if (dryRun && action === 'merge') {
      console.log('To actually perform the merge, run without --dry-run:\n');
      console.log('  node scripts/merge-corrupted-nominations.js merge\n');
    }
    process.exit(0);
  }

  // Actually perform the merge
  if (action === 'merge' && !dryRun) {
    console.log('🚀 PERFORMING MERGE...\n');

    for (const merge of merges) {
      try {
        if (merge.filesMerged > 0 && merge.merged) {
          // Update clean doc with merged uploads
          await merge.cleanRef.update({
            uploads: merge.merged,
            mergedAt: new Date(),
            mergedFrom: merge.corruptedId,
          });
          console.log(`✅ Updated ${merge.cleanId} with ${merge.filesMerged} files`);
        }

        // Delete corrupted doc
        await merge.corruptedRef.delete();
        console.log(`🗑️  Deleted corrupted doc ${merge.corruptedId}\n`);
      } catch (error) {
        console.error(`❌ Error processing ${merge.corruptedId}:`, error.message, '\n');
      }
    }

    console.log(`\n✨ Merge complete!`);
    console.log(`   Total files merged: ${totalFilesMerged}`);
    console.log(`   Records processed: ${merges.length}\n`);
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nMake sure:');
  console.error('1. Firebase credentials are set (env var or file in project root)');
  console.error('2. You have internet connection to Firebase');
  console.error('3. Your credentials have write access to Firestore\n');
  process.exit(1);
}
