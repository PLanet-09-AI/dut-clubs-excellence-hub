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

async function compare() {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('🔍 SIDE-BY-SIDE COMPARISON: CLEAN VS CORRUPTED');
    console.log('='.repeat(100) + '\n');

    // Get clean record
    const cleanQuery = await db.collection('nominations')
      .where('nomineeName', '==', 'Yonwaba')
      .get();
    const cleanDoc = cleanQuery.docs[0];
    const cleanData = cleanDoc.data();

    // Get corrupted record
    const corruptedSnap = await db.collection('nominations').doc('e8KIkGYopWLUBpEoVj20').get();
    const corruptedData = corruptedSnap.data();

    console.log('📄 RECORD METADATA:\n');
    console.log(`${'CLEAN (sIceBhuK5WqezbYQJxqN)'.padEnd(40)} | ${'CORRUPTED (e8KIkGYopWLUBpEoVj20)'.padEnd(40)}`);
    console.log('-'.repeat(100));
    
    console.log(`${String(cleanData.nomineeName).padEnd(40)} | ${String(corruptedData.nomineeName).padEnd(40)}`);
    console.log(`${String(cleanData.nomineeEmail).padEnd(40)} | ${String(corruptedData.nomineeEmail).padEnd(40)}`);
    console.log(`${String(cleanData.categoryId).padEnd(40)} | ${String(corruptedData.categoryId).padEnd(40)}`);
    console.log(`${String(Object.keys(cleanData.answers || {}).length + ' answers').padEnd(40)} | ${String(Object.keys(corruptedData.answers || {}).length + ' answers').padEnd(40)}`);

    // Count files in each
    let cleanFileCount = 0;
    let corruptedFileCount = 0;

    for (const [q, slots] of Object.entries(cleanData.uploads || {})) {
      for (const [s, files] of Object.entries(slots)) {
        if (Array.isArray(files)) cleanFileCount += files.length;
      }
    }

    for (const [q, slots] of Object.entries(corruptedData.uploads || {})) {
      for (const [s, files] of Object.entries(slots)) {
        if (Array.isArray(files)) corruptedFileCount += files.length;
      }
    }

    console.log(`${String(cleanFileCount + ' files').padEnd(40)} | ${String(corruptedFileCount + ' files').padEnd(40)}\n`);

    // Detailed file comparison
    console.log('\n' + '='.repeat(100));
    console.log('📁 DETAILED FILE BREAKDOWN:\n');

    const questions = ['ent-1', 'ent-2', 'ent-3', 'ent-4', 'ent-5'];

    for (const q of questions) {
      const cleanSlots = cleanData.uploads?.[q] || {};
      const corruptedSlots = corruptedData.uploads?.[q] || {};

      console.log(`\n${q}:`);
      console.log('-'.repeat(100));

      for (const slot of ['e0', 'e1', 'e2', 'e3']) {
        const cleanFiles = cleanSlots[slot] || [];
        const corruptedFiles = corruptedSlots[slot] || [];

        const cleanCount = Array.isArray(cleanFiles) ? cleanFiles.length : 0;
        const corruptedCount = Array.isArray(corruptedFiles) ? corruptedFiles.length : 0;

        console.log(`  ${slot}:`);
        console.log(`    Clean:     ${cleanCount} file(s)`);
        if (cleanCount > 0) {
          for (const f of cleanFiles) {
            console.log(`      ✅ ${f.name || f.url || f}`);
          }
        }

        console.log(`    Corrupted: ${corruptedCount} file(s)`);
        if (corruptedCount > 0) {
          for (const f of corruptedFiles) {
            console.log(`      ✅ ${f.name || f.url || f}`);
          }
        }

        // Check for differences
        if (cleanCount !== corruptedCount) {
          console.log(`    ⚠️  DIFFERENCE! Clean: ${cleanCount}, Corrupted: ${corruptedCount}`);
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(100));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Clean record files:     ${cleanFileCount}`);
    console.log(`Corrupted record files: ${corruptedFileCount}`);
    console.log(`Difference:             ${Math.abs(cleanFileCount - corruptedFileCount)} file(s)\n`);

    if (cleanFileCount === corruptedFileCount) {
      console.log('✅ BOTH DOCUMENTS HAVE THE SAME FILES');
      console.log(`   (Total: ${cleanFileCount} files)\n`);
    } else if (corruptedFileCount > cleanFileCount) {
      console.log(`⚠️  CORRUPTED HAS ${corruptedFileCount - cleanFileCount} EXTRA FILE(S)!\n`);
    } else {
      console.log(`ℹ️  Clean record has more files\n`);
    }

    console.log('='.repeat(100) + '\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

compare();
