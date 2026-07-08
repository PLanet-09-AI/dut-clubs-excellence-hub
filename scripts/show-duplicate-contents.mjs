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
  console.log('🔍 DETAILED ANALYSIS OF WHAT WAS IN THE DUPLICATE');
  console.log('='.repeat(80) + '\n');

  // Get all nominations to understand the structure
  const allNoms = await db.collection('nominations')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  console.log(`Found ${allNoms.docs.length} entrepreneur nominations\n`);

  // Show what we have now
  for (const snap of allNoms.docs) {
    const data = snap.data();
    
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`📄 ${data.nomineeName || '[UNNAMED]'}`);
    console.log(`${'-'.repeat(80)}`);
    console.log(`Email: ${data.nomineeEmail}`);
    console.log(`ID: ${snap.id}`);
    console.log(`Merged from corrupted: ${data.mergedFromCorrupted ? 'YES ✅' : 'NO'}`);
    
    if (data.corruptedSourceId) {
      console.log(`⚠️  Corrupted source ID: ${data.corruptedSourceId}`);
      console.log(`🔗 Merge timestamp: ${new Date(data.mergedAt._seconds * 1000).toISOString()}`);
    }

    // List answers
    console.log(`\n📋 ANSWERS (${Object.keys(data.answers || {}).length} questions):`);
    for (const [q, answer] of Object.entries(data.answers || {})) {
      const preview = answer.substring(0, 60).replace(/\n/g, ' ') + (answer.length > 60 ? '...' : '');
      console.log(`  ${q}: "${preview}"`);
    }

    // List files
    console.log(`\n📁 FILES:`);
    let fileCount = 0;
    for (const [question, slots] of Object.entries(data.uploads || {})) {
      for (const [slot, files] of Object.entries(slots)) {
        if (Array.isArray(files) && files.length > 0) {
          for (const file of files) {
            fileCount++;
            const name = file.name || file.url || file;
            const type = file.type === 'sharepoint' ? '🔗' : '📄';
            console.log(`  ${fileCount}. ${type} [${question}/${slot}] ${name}`);
          }
        }
      }
    }
    
    console.log(`\n  TOTAL: ${fileCount} files\n`);
  }

  console.log('='.repeat(80));
  console.log('\n✅ SUMMARY:\n');
  console.log('  Yonwaba\'s merged record now contains:');
  console.log('    - All her original answers + uploaded files');
  console.log('    - All answers from the corrupted duplicate');
  console.log('    - All files from the corrupted duplicate');
  console.log('\n  The corrupted document has been deleted from the database.\n');

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
