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

async function main() {
  try {
    console.log('\n✅ YONWABA\'S COMPLETE MERGED RECORD\n');
    console.log('='.repeat(80) + '\n');

    const yonwabaQuery = await db.collection('nominations')
      .where('nomineeName', '==', 'Yonwaba')
      .get();

    const yonwaba = yonwabaQuery.docs[0];
    const data = yonwaba.data();

    console.log('📋 ANSWERS:');
    for (const [q, ans] of Object.entries(data.answers || {})) {
      console.log(`  ${q}: ${ans.substring(0, 50)}...`);
    }

    console.log('\n📁 FILES BY QUESTION:\n');
    
    let totalFiles = 0;
    const questions = ['ent-1', 'ent-2', 'ent-3', 'ent-4', 'ent-5'];
    
    for (const q of questions) {
      const slots = data.uploads?.[q] || {};
      let qCount = 0;
      
      console.log(`${q}:`);
      for (const slot of ['e0', 'e1', 'e2', 'e3']) {
        const files = slots[slot] || [];
        if (Array.isArray(files) && files.length > 0) {
          console.log(`  ${slot}: ${files.length} file(s)`);
          for (const f of files) {
            console.log(`    - ${f.name || f.url || f}`);
            qCount++;
            totalFiles++;
          }
        }
      }
      if (qCount === 0) {
        console.log(`  (no files)`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log(`\n✅ TOTAL FILES: ${totalFiles}\n`);

    if (totalFiles === 11) {
      console.log('⚠️  MISSING 1 FILE to reach 12\n');
      console.log('📍 Possible solutions:');
      console.log('  1. Check if 12th file was actually uploaded (or counted twice)');
      console.log('  2. The 12 may have been a miscount');
      console.log('  3. One file may not have uploaded successfully\n');
    } else if (totalFiles === 12) {
      console.log('🎉 ALL 12 FILES PRESENT!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
