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

function countAllFiles(uploads) {
  let total = 0;
  for (const questionId in uploads) {
    const slots = uploads[questionId];
    for (const slotKey in slots) {
      const files = slots[slotKey];
      if (Array.isArray(files)) {
        total += files.length;
      }
    }
  }
  return total;
}

function listAllFiles(uploads) {
  const files = [];
  for (const questionId in uploads) {
    const slots = uploads[questionId];
    for (const slotKey in slots) {
      const fileArray = slots[slotKey];
      if (Array.isArray(fileArray)) {
        for (const file of fileArray) {
          files.push({
            question: questionId,
            slot: slotKey,
            name: file.name || file,
            type: file.type || 'file'
          });
        }
      }
    }
  }
  return files;
}

try {
  console.log('='.repeat(80));
  console.log('📊 COMPLETE VERIFICATION OF ALL ENTREPRENEUR NOMINATIONS');
  console.log('='.repeat(80) + '\n');

  // Get all entrepreneur nominations
  const allEntrepreneur = await db.collection('nominations')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  console.log(`Found ${allEntrepreneur.docs.length} entrepreneur nominations\n`);

  for (const doc of allEntrepreneur.docs) {
    const data = doc.data();
    const totalFiles = countAllFiles(data.uploads || {});
    const filesList = listAllFiles(data.uploads || {});

    console.log('-'.repeat(80));
    console.log(`🗂️  NOMINATION: ${data.nomineeName || '(EMPTY)'}`);
    console.log('-'.repeat(80));
    console.log(`ID: ${doc.id}`);
    console.log(`Email: ${data.nomineeEmail || '(EMPTY)'}`);
    console.log(`Student #: ${data.studentNumber || '(EMPTY)'}`);
    console.log(`Status: ${data.status}`);
    console.log(`Merged from corrupted: ${data.mergedFromCorrupted ? 'YES' : 'NO'}`);
    console.log(`\n📋 ANSWERS (${Object.keys(data.answers || {}).length} questions):`);
    for (const [qId, answer] of Object.entries(data.answers || {})) {
      const preview = answer.substring(0, 60).replace(/\n/g, ' ');
      console.log(`   ${qId}: ${preview}...`);
    }

    console.log(`\n📁 FILES (${totalFiles} total):`);
    if (filesList.length === 0) {
      console.log('   (no files)');
    } else {
      filesList.forEach((file, idx) => {
        console.log(`   ${idx + 1}. [${file.question}/${file.slot}] ${file.name} (${file.type})`);
      });
    }

    console.log('\n');
  }

  // Now compare Yonwaba's merged record
  console.log('='.repeat(80));
  console.log('🔍 DETAILED COMPARISON: YONWABA MERGED RECORD');
  console.log('='.repeat(80) + '\n');

  const yonwabaSnap = allEntrepreneur.docs.find(
    doc => doc.data().nomineeName === 'Yonwaba'
  );

  if (yonwabaSnap) {
    const yonwaba = yonwabaSnap.data();
    const yonwabaFiles = listAllFiles(yonwaba.uploads || {});

    console.log('📋 ALL FILES IN YONWABA\'S MERGED RECORD:\n');
    yonwabaFiles.forEach((file, idx) => {
      console.log(`${idx + 1}. ${file.name}`);
      console.log(`   Question: ${file.question} | Slot: ${file.slot} | Type: ${file.type}`);
    });

    console.log(`\n✅ TOTAL: ${yonwabaFiles.length} files in Yonwaba's record`);
    
    if (yonwabaFiles.length === 12) {
      console.log('✅ CORRECT! All 12 files are present.\n');
    } else if (yonwabaFiles.length === 11) {
      console.log('⚠️  MISSING 1 FILE!\n');
    } else {
      console.log(`⚠️  EXPECTED 12, but found ${yonwabaFiles.length} files!\n`);
    }
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
