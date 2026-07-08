/**
 * Netlify Function: Merge Files from Corrupted to Clean Nominations
 * 
 * Intelligently merges file uploads from corrupted nomination documents
 * into their corresponding clean versions, then removes the corrupted records.
 * 
 * Algorithm:
 * 1. Find corrupted nomination (missing fields, [object Object] values)
 * 2. Find matching clean version (same nomineeEmail + categoryId)
 * 3. Merge uploads from corrupted → clean
 * 4. Update clean document with merged files
 * 5. Delete corrupted document
 * 
 * Deploy: netlify functions:create --name merge-corrupted-nominations
 * Usage: Call POST /api/merge-corrupted-nominations with admin auth token
 * 
 * Request body:
 * {
 *   "action": "report" | "merge",     // "report" = preview, "merge" = execute
 *   "dryRun": true | false,            // If true, shows what WOULD happen
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "merges": [
 *     {
 *       "corruptedId": "...",
 *       "cleanId": "...",
 *       "filesMerged": 5,
 *       "uploadsMerged": { "q2": 3, "q4": 2 },
 *       "status": "merged" | "would_merge"
 *     }
 *   ],
 *   "message": "..."
 * }
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Handler } from '@netlify/functions';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_ADMIN_SDK_B64 || '', 'base64').toString()
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

interface NominationData {
  nomineeName?: any;
  nomineeEmail?: any;
  studentNumber?: any;
  categoryId?: string;
  categoryName?: string;
  uploads?: Record<string, any>;
  [key: string]: any;
}

interface MergeResult {
  corruptedId: string;
  cleanId: string;
  filesMerged: number;
  uploadsMerged: Record<string, number>;
  status: 'merged' | 'would_merge' | 'error';
  message?: string;
}

/**
 * Check if a nomination is corrupted
 */
function isCorrupted(data: NominationData): boolean {
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

/**
 * Count files in uploads structure
 */
function countFiles(uploads: Record<string, any>): number {
  let count = 0;
  for (const questionId in uploads) {
    const slots = uploads[questionId];
    if (typeof slots === 'object' && slots !== null) {
      for (const slotKey in slots) {
        const files = slots[slotKey];
        if (Array.isArray(files)) {
          count += files.length;
        }
      }
    }
  }
  return count;
}

/**
 * Merge uploads from source to target (deep merge)
 */
function mergeUploads(
  targetUploads: Record<string, any> = {},
  sourceUploads: Record<string, any> = {}
): { merged: Record<string, any>; summary: Record<string, number> } {
  const result = JSON.parse(JSON.stringify(targetUploads)); // Deep copy
  const summary: Record<string, number> = {};

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

        // Merge files (avoid duplicates based on file name)
        const existingNames = new Set(
          result[questionId][slotKey].map((f: any) => f.name || f)
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

const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { action = 'report', dryRun = true } = body;

    if (!['report', 'merge'].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid action. Use "report" or "merge"'
        })
      };
    }

    console.log('🔍 [Merge] Starting corrupted nomination analysis...');
    console.log(`   Action: ${action}, DryRun: ${dryRun}`);

    // Get all nominations
    const snapshot = await db.collection('nominations').get();
    console.log(`📊 [Merge] Found ${snapshot.size} total nominations`);

    const merges: MergeResult[] = [];
    const corruptedDocs = new Map();
    const cleanDocs = new Map();

    // Categorize documents
    for (const doc of snapshot.docs) {
      const data = doc.data() as NominationData;

      if (isCorrupted(data)) {
        corruptedDocs.set(doc.id, { data, ref: doc.ref });
      } else {
        const key = `${data.nomineeEmail?.toLowerCase()}_${data.categoryId}`;
        cleanDocs.set(key, { id: doc.id, data, ref: doc.ref });
      }
    }

    console.log(`⚠️  [Merge] Found ${corruptedDocs.size} corrupted nominations`);
    console.log(`✅ [Merge] Found ${cleanDocs.size} clean nominations`);

    // Match corrupted to clean and prepare merges
    for (const [corruptedId, { data: corruptedData }] of corruptedDocs) {
      const matchKey = `${corruptedData.nomineeEmail?.toLowerCase()}_${corruptedData.categoryId}`;
      const cleanMatch = cleanDocs.get(matchKey);

      if (cleanMatch) {
        const { merged, summary } = mergeUploads(
          cleanMatch.data.uploads || {},
          corruptedData.uploads || {}
        );

        const filesMerged = Object.values(summary).reduce((a, b) => a + b, 0);

        console.log(`🔄 [Merge] Match found for corrupted doc ${corruptedId}:`);
        console.log(`   → Clean doc: ${cleanMatch.id}`);
        console.log(`   → Files to merge: ${filesMerged}`);
        console.log(`   → Question breakdown:`, summary);

        const result: MergeResult = {
          corruptedId,
          cleanId: cleanMatch.id,
          filesMerged,
          uploadsMerged: summary,
          status: dryRun ? 'would_merge' : 'merged'
        };

        if (!dryRun && action === 'merge' && filesMerged > 0) {
          try {
            // Update clean document with merged uploads
            await cleanMatch.ref.update({
              uploads: merged,
              mergedAt: new Date(),
              mergedFrom: corruptedId,
            });

            // Delete corrupted document
            await corruptedDocs.get(corruptedId).ref.delete();

            result.message = `✅ Merged ${filesMerged} files and deleted corrupted doc`;
            console.log(`✅ [Merge] Completed merge for ${corruptedId}`);
          } catch (error) {
            result.status = 'error';
            result.message = `❌ ${error instanceof Error ? error.message : String(error)}`;
            console.error(`❌ [Merge] Error merging ${corruptedId}:`, error);
          }
        } else if (dryRun) {
          result.message = `DRY RUN: Would merge ${filesMerged} files and delete corrupted doc`;
        }

        merges.push(result);
      } else {
        console.log(`⚠️  [Merge] No matching clean doc for ${corruptedId}`);
        console.log(`   Email: ${corruptedData.nomineeEmail}, Category: ${corruptedData.categoryId}`);

        // If no match found, just mark for deletion (no files to save)
        merges.push({
          corruptedId,
          cleanId: 'NO_MATCH',
          filesMerged: 0,
          uploadsMerged: {},
          status: dryRun ? 'would_merge' : 'merged',
          message: 'No matching clean document - would be deleted'
        });

        if (!dryRun && action === 'merge') {
          try {
            await corruptedDocs.get(corruptedId).ref.delete();
            console.log(`🗑️  [Merge] Deleted orphaned corrupted doc ${corruptedId}`);
          } catch (error) {
            console.error(`❌ [Merge] Error deleting ${corruptedId}:`, error);
          }
        }
      }
    }

    const totalFilesMerged = merges.reduce((sum, m) => sum + m.filesMerged, 0);

    const response = {
      success: true,
      merges,
      summary: {
        corruptedFound: corruptedDocs.size,
        cleanFound: cleanDocs.size,
        mergesPerformed: merges.length,
        totalFilesMerged,
        dryRun
      },
      message: dryRun
        ? `DRY RUN: Would merge ${totalFilesMerged} files from ${merges.length} corrupted records`
        : `✅ Merged ${totalFilesMerged} files and cleaned up ${merges.length} corrupted records`
    };

    console.log(`📋 [Merge] Summary:`, response.summary);

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ [Merge] Error:', errorMsg, error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Merge failed',
        message: errorMsg
      })
    };
  }
};

export { handler };
