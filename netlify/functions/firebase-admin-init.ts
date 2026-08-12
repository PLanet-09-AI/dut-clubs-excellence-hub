/**
 * Firebase Admin SDK initialization helper for Netlify Functions
 * Loads credentials from local JSON file instead of environment variables
 * This avoids the AWS Lambda 4KB environment variable limit
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let _adminApp: ReturnType<typeof initializeApp> | null = null;

/**
 * Get or create the Firebase Admin app instance
 * Loads service account credentials from local JSON file
 */
export function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    // Read service account from local JSON file
    const credPath = resolve(__dirname, 'student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json');
    const serviceAccount = JSON.parse(readFileSync(credPath, 'utf-8'));
    
    // Initialize Firebase Admin SDK
    const app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: 'student-services-745d5.appspot.com',
    });

    return app;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error(`Firebase Admin SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get Firebase Storage bucket
 */
export function getStorageBucket(bucketName = 'student-services-745d5.appspot.com') {
  const app = getAdminApp();
  return getStorage(app).bucket(bucketName);
}

/**
 * Get Firestore database
 */
export function getFirestoreDb() {
  const app = getAdminApp();
  return getFirestore(app);
}

/**
 * Get Firebase Auth
 */
export function getAuthService() {
  const app = getAdminApp();
  return getAuth(app);
}
