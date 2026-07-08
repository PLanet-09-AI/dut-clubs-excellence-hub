import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json', 'utf-8')
);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'student-services-745d5.appspot.com'
});

const db = getFirestore();
const bucket = getStorage().bucket();

try {
  console.log('='.repeat(80));
  console.log('🔎 CHECKING FIREBASE STORAGE FOR MISSING FILES');
  console.log('='.repeat(80) + '\n');

  // Get Yonwaba's record to find the UUID
  const yonwabaQuery = await db.collection('nominations')
    .where('nomineeName', '==', 'Yonwaba')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  const yonwabaSnap = yonwabaQuery.docs[0];
  const yonwaba = yonwabaSnap.data();

  console.log('Yonwaba ID:', yonwabaSnap.id);
  console.log('Yonwaba uploads data:', yonwaba.uploads);
  console.log('\n' + '='.repeat(80));
  console.log('🔎 CHECKING FOR ANY FILES IN STORAGE UNDER ENT-2/E3:');
  console.log('='.repeat(80) + '\n');

  // Check the file system for any evidence of what should be in ent-2/e3
  // List the ent-2 directory
  const [files] = await bucket.getFiles({
    prefix: `nominations/entrepreneur/06c89254-fffd-46a5-b667-3168629fd3dc/ent-2/e3/`,
  });

  console.log('Files found in ent-2/e3/:\n');
  if (files.length === 0) {
    console.log('  ❌ NO FILES FOUND');
  } else {
    for (const file of files) {
      console.log(`  ✅ ${file.name}`);
    }
  }

  // Also check ent-2/e0 and ent-2/e2 in case they should have files
  console.log('\n\nChecking all ent-2 slots:\n');
  for (const slot of ['e0', 'e1', 'e2', 'e3']) {
    const [slotFiles] = await bucket.getFiles({
      prefix: `nominations/entrepreneur/06c89254-fffd-46a5-b667-3168629fd3dc/ent-2/${slot}/`,
    });
    console.log(`ent-2/${slot}: ${slotFiles.length} file(s)`);
    for (const file of slotFiles) {
      const name = file.name.split('/').pop();
      console.log(`  - ${name}`);
    }
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
