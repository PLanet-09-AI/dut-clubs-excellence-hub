import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json', 'utf-8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

try {
  console.log('='.repeat(100));
  console.log('✅ FINAL FILE VERIFICATION REPORT - YONWABA\'S MERGED NOMINATION');
  console.log('='.repeat(100) + '\n');

  const yonwabaQuery = await db.collection('nominations')
    .where('nomineeName', '==', 'Yonwaba')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  const yonwaba = yonwabaQuery.docs[0].data();

  console.log('📋 DOCUMENT METADATA:\n');
  console.log(`  Record ID: ${yonwabaQuery.docs[0].id}`);
  console.log(`  Merged from corrupted: ${yonwaba.mergedFromCorrupted}`);
  console.log(`  Corrupted source ID: ${yonwaba.corruptedSourceId}`);
  console.log(`  Merge timestamp: ${new Date(yonwaba.mergedAt._seconds * 1000).toISOString()}\n`);

  console.log('📁 ALL FILES IN MERGED RECORD:\n');

  let fileIndex = 1;
  const questions = ['ent-1', 'ent-2', 'ent-3', 'ent-4', 'ent-5'];
  let totalCount = 0;

  for (const q of questions) {
    const slots = yonwaba.uploads?.[q] || {};
    let questionCount = 0;

    for (const slot of ['e0', 'e1', 'e2', 'e3']) {
      const files = slots[slot] || [];
      if (Array.isArray(files) && files.length > 0) {
        for (const file of files) {
          const type = file.type === 'sharepoint' ? '🔗 LINK' : '📄 FILE';
          const name = file.name || 'Unknown';
          console.log(`  ${String(fileIndex).padStart(2, '0')}. ${type}  ${q}/${slot}  →  ${name}`);
          fileIndex++;
          totalCount++;
          questionCount++;
        }
      }
    }

    if (questionCount === 0) {
      console.log(`  ${q}: NO FILES`);
    }
    console.log('');
  }

  console.log('='.repeat(100));
  console.log(`📊 SUMMARY:\n`);
  console.log(`  Total files merged: ${totalCount}`);
  console.log(`  Expected by user: 12`);
  console.log(`  Status: ${totalCount === 12 ? '✅ COMPLETE' : `⚠️  MISSING ${12 - totalCount} FILE(S)`}\n`);

  if (totalCount !== 12) {
    console.log('📍 EMPTY SLOTS THAT MAY NEED FILES:\n');
    for (const q of questions) {
      const slots = yonwaba.uploads?.[q] || {};
      for (const slot of ['e0', 'e1', 'e2', 'e3']) {
        const files = slots[slot] || [];
        if (Array.isArray(files) && files.length === 0) {
          console.log(`  ⚠️  ${q}/${slot} is empty (may need file)`);
        }
      }
    }
    console.log('\n💡 ACTION REQUIRED:\n');
    console.log('  1. Please confirm expected file count (12 or 11?)');
    console.log('  2. If 12 is correct, identify which file is missing');
    console.log('  3. Check if any files should be in: ent-2/e3, ent-4/e0-e3, or ent-5/e0-e1/e3\n');
  }

  console.log('='.repeat(100) + '\n');

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
