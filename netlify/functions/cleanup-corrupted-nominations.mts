/**
 * Netlify Function: Cleanup Corrupted Nominations
 * 
 * Identifies and reports corrupted nomination documents in Firestore.
 * Corrupted documents have missing required fields or [object Object] values.
 * 
 * Deploy: netlify functions:create --name cleanup-corrupted-nominations
 * Usage: Call POST /api/cleanup-corrupted-nominations with admin auth token
 * 
 * Request body:
 * {
 *   "action": "list" | "delete",      // "list" = report only, "delete" = remove
 *   "dryRun": true | false,            // If true, shows what WOULD be deleted
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "corrupted": [...],                 // List of corrupted documents found
 *   "deleted": [...],                   // List of deleted document IDs (if action='delete')
 *   "message": "..."
 * }
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Handler } from '@netlify/functions';

// Firebase Admin will be initialized in the handler (defer to avoid crash if env var missing)
let db: any = null;

function initializeFirebase() {
  if (db) return; // Already initialized
  
  const credB64 = process.env.FIREBASE_ADMIN_SDK_B64 || '';
  if (!credB64) {
    throw new Error('FIREBASE_ADMIN_SDK_B64 environment variable is not set');
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(credB64, 'base64').toString()
    );
    initializeApp({
      credential: cert(serviceAccount),
    });
    db = getFirestore();
  } catch (error) {
    throw new Error(`Failed to initialize Firebase: ${error}`);
  }
}

interface CorruptedNomination {
  id: string;
  reason: string;
  data: Record<string, any>;
}

interface CleanupResponse {
  success: boolean;
  corrupted: CorruptedNomination[];
  deleted: string[];
  message: string;
}

/**
 * Check if a nomination document is corrupted
 */
function isCorrupted(docId: string, data: Record<string, any>): { corrupted: boolean; reason: string } {
  const requiredFields = [
    'nomineeName',
    'nomineeEmail',
    'studentNumber',
    'categoryId',
    'categoryName',
    'status'
  ];

  // Check for missing required fields
  for (const field of requiredFields) {
    if (!data[field]) {
      return {
        corrupted: true,
        reason: `Missing required field: ${field}`
      };
    }
  }

  // Check for [object Object] strings (serialization error)
  const dataStr = JSON.stringify(data);
  if (dataStr.includes('[object Object]')) {
    return {
      corrupted: true,
      reason: 'Contains [object Object] serialization error'
    };
  }

  // Check if key fields are objects instead of strings (type corruption)
  if (typeof data.nomineeName === 'object' && data.nomineeName !== null) {
    return {
      corrupted: true,
      reason: 'nomineeName is object instead of string'
    };
  }

  if (typeof data.nomineeEmail === 'object' && data.nomineeEmail !== null) {
    return {
      corrupted: true,
      reason: 'nomineeEmail is object instead of string'
    };
  }

  if (typeof data.studentNumber === 'object' && data.studentNumber !== null) {
    return {
      corrupted: true,
      reason: 'studentNumber is object instead of string'
    };
  }

  return { corrupted: false, reason: '' };
}

const handler: Handler = async (event) => {
  try {
    // Initialize Firebase on first request
    initializeFirebase();

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { action = 'list', dryRun = true } = body;

    if (!['list', 'delete'].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid action. Use "list" or "delete"'
        })
      };
    }

    console.log('🔍 [Cleanup] Starting scan for corrupted nominations...');
    console.log(`   Action: ${action}, DryRun: ${dryRun}`);

    // Query all nominations
    const snapshot = await db.collection('nominations').get();
    console.log(`📊 [Cleanup] Found ${snapshot.size} total nominations`);

    const corrupted: CorruptedNomination[] = [];

    // Check each nomination
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const { corrupted: isCorruptedDoc, reason } = isCorrupted(doc.id, data);

      if (isCorruptedDoc) {
        corrupted.push({
          id: doc.id,
          reason,
          data: {
            nomineeName: data.nomineeName,
            nomineeEmail: data.nomineeEmail,
            studentNumber: data.studentNumber,
            categoryId: data.categoryId,
            categoryName: data.categoryName,
            createdAt: data.createdAt,
            status: data.status,
          }
        });
      }
    }

    console.log(`⚠️  [Cleanup] Found ${corrupted.length} corrupted nominations`);

    let response: CleanupResponse = {
      success: true,
      corrupted,
      deleted: [],
      message: `Found ${corrupted.length} corrupted nominations`
    };

    // Delete if requested and not a dry run
    if (action === 'delete' && !dryRun && corrupted.length > 0) {
      console.log(`🗑️  [Cleanup] Deleting ${corrupted.length} corrupted documents...`);

      const batch = db.batch();
      for (const item of corrupted) {
        const docRef = db.collection('nominations').doc(item.id);
        batch.delete(docRef);
        console.log(`   Deleting: ${item.id} (${item.reason})`);
      }

      await batch.commit();
      console.log(`✅ [Cleanup] Successfully deleted ${corrupted.length} documents`);

      response = {
        success: true,
        corrupted,
        deleted: corrupted.map(c => c.id),
        message: `✅ Deleted ${corrupted.length} corrupted nominations`
      };
    } else if (action === 'delete' && dryRun) {
      response.message = `DRY RUN: Would delete ${corrupted.length} corrupted nominations. Set dryRun=false to execute.`;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ [Cleanup] Error:', errorMsg, error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Cleanup failed',
        message: errorMsg
      })
    };
  }
};

export { handler };
