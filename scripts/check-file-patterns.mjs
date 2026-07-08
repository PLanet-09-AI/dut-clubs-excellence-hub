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
  console.log('📋 CHECKING ALL ENTREPRENEUR NOMINATIONS FOR COMPARISON');
  console.log('='.repeat(80) + '\n');

  const query = await db.collection('nominations')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  console.log(`Found ${query.size} entrepreneur nominations\n`);

  let totalCount = 0;
  for (const snap of query.docs) {
    const data = snap.data();
    const uploads = data.uploads || {};
    
    let count = 0;
    for (const [question, slots] of Object.entries(uploads)) {
      for (const [slot, files] of Object.entries(slots)) {
        if (Array.isArray(files)) {
          count += files.length;
        }
      }
    }

    console.log(`${data.nomineeName || '[UNNAMED]'}:`);
    console.log(`  Email: ${data.nomineeEmail || '[NO EMAIL]'}`);
    console.log(`  ID: ${snap.id}`);
    console.log(`  Files: ${count}`);
    console.log(`  Merged from corrupted: ${data.mergedFromCorrupted ? 'YES' : 'NO'}`);
    
    if (data.corruptedSourceId) {
      console.log(`  Corrupted source ID: ${data.corruptedSourceId}`);
    }
    
    // Show file breakdown by question
    console.log(`  Breakdown:`);
    for (const question of ['ent-1', 'ent-2', 'ent-3', 'ent-4', 'ent-5']) {
      const slots = uploads[question] || {};
      let qCount = 0;
      for (const files of Object.values(slots)) {
        if (Array.isArray(files)) qCount += files.length;
      }
      console.log(`    ${question}: ${qCount} file(s)`);
    }
    console.log('');
    totalCount += count;
  }

  console.log('='.repeat(80));
  console.log(`✅ TOTAL ACROSS ALL ENTREPRENEUR NOMINATIONS: ${totalCount} files`);
  console.log('='.repeat(80) + '\n');

  // Now let's check if ent-2 typically has files in e3 across all categories
  console.log('🔍 CHECKING ENT-2 STRUCTURE ACROSS ALL NOMINATIONS:');
  const allNominations = await db.collection('nominations').get();
  
  let ent2e3FileCount = 0;
  let ent2e3DocumentsWithFiles = 0;

  for (const snap of allNominations.docs) {
    const data = snap.data();
    const ent2 = data.uploads?.['ent-2'] || {};
    const e3Files = ent2.e3;
    
    if (Array.isArray(e3Files) && e3Files.length > 0) {
      ent2e3DocumentsWithFiles++;
      ent2e3FileCount += e3Files.length;
    }
  }

  console.log(`  Documents with ent-2/e3 files: ${ent2e3DocumentsWithFiles}`);
  console.log(`  Total files in ent-2/e3 across system: ${ent2e3FileCount}\n`);

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
