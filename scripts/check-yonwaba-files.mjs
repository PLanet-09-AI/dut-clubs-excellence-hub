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
  console.log('='.repeat(80));
  console.log('🔎 DETAILED FILE STRUCTURE COMPARISON');
  console.log('='.repeat(80) + '\n');

  // Get Yonwaba's current record
  const yonwabaQuery = await db.collection('nominations')
    .where('nomineeName', '==', 'Yonwaba')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  if (yonwabaQuery.empty) {
    console.log('❌ Yonwaba not found\n');
    process.exit(1);
  }

  const yonwabaSnap = yonwabaQuery.docs[0];
  const yonwaba = yonwabaSnap.data();

  console.log('📄 YONWABA\'S RECORD:\n');
  console.log(JSON.stringify(yonwaba, null, 2));

  // Count files by question
  console.log('\n' + '='.repeat(80));
  console.log('📊 FILE BREAKDOWN BY QUESTION:\n');

  const uploads = yonwaba.uploads || {};
  let totalCount = 0;

  for (const [question, slots] of Object.entries(uploads)) {
    console.log(`${question}:`);
    for (const [slot, files] of Object.entries(slots)) {
      if (Array.isArray(files)) {
        console.log(`  ${slot}: ${files.length} file(s)`);
        for (const file of files) {
          console.log(`    - ${file.name || file}`);
        }
        totalCount += files.length;
      }
    }
    console.log('');
  }

  console.log(`\n✅ TOTAL FILES: ${totalCount}`);
  console.log(`   Expected: 12`);
  console.log(`   Missing: ${12 - totalCount}\n`);

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
