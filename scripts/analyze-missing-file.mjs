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

try {
  console.log('='.repeat(80));
  console.log('🔍 ANALYZING FILE COUNT AND MERGE COMPLETENESS');
  console.log('='.repeat(80) + '\n');

  // Get Yonwaba's record with full details
  const yonwabaQuery = await db.collection('nominations')
    .where('nomineeName', '==', 'Yonwaba')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  if (yonwabaQuery.empty) {
    console.log('❌ Yonwaba not found\n');
    process.exit(1);
  }

  const yonwabaDoc = yonwabaQuery.docs[0];
  const yonwaba = yonwabaDoc.data();

  console.log('📄 YONWABA\'S CURRENT RECORD:\n');
  console.log(`ID: ${yonwabaDoc.id}`);
  console.log(`Merged from corrupted: ${yonwaba.mergedFromCorrupted}`);
  console.log(`Corrupted source ID: ${yonwaba.corruptedSourceId}\n`);

  // Count actual files
  let totalFiles = 0;
  let filesByQuestion = {};

  for (const [question, slots] of Object.entries(yonwaba.uploads || {})) {
    let qCount = 0;
    for (const [slot, files] of Object.entries(slots)) {
      if (Array.isArray(files)) {
        qCount += files.length;
      }
    }
    filesByQuestion[question] = qCount;
    totalFiles += qCount;
  }

  console.log('📊 CURRENT FILE COUNT BY QUESTION:\n');
  for (const [q, count] of Object.entries(filesByQuestion)) {
    console.log(`  ${q}: ${count} file(s)`);
  }
  console.log(`\nTOTAL: ${totalFiles} files`);

  // Now let's check the form structure to understand what slots should have files
  console.log('\n' + '='.repeat(80));
  console.log('📋 FORM STRUCTURE ANALYSIS:\n');
  
  // Simiso Nzuza has the most files, so let's look at their structure
  const simiso = await db.collection('nominations')
    .where('nomineeName', '==', 'Simiso Nzuza')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  if (!simiso.empty) {
    const simisoData = simiso.docs[0].data();
    console.log('Simiso Nzuza structure (reference for full form):\n');
    for (const [q, slots] of Object.entries(simisoData.uploads || {})) {
      const slotList = Object.keys(slots).map(s => `${s} (${(slots[s] || []).length} files)`).join(', ');
      console.log(`  ${q}: ${slotList}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('❓ FILE COUNT DISCREPANCY:\n');
  console.log(`Expected: 12 files`);
  console.log(`Actual: ${totalFiles} files`);
  console.log(`Missing: ${12 - totalFiles} file(s)\n`);

  if (totalFiles < 12) {
    console.log('📍 POTENTIAL ISSUES:\n');
    console.log('1. ent-2/e3 is EMPTY - should have files?');
    console.log('2. ent-4 only has e1 slot - missing e0, e2, e3?');
    console.log('3. ent-5 only has e2 slot - missing e0, e1, e3?');
    console.log('\n💡 Hypothesis: The 12th file may be in one of these empty slots.\n');
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
