import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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
    console.log('\n📋 RESTORING CORRUPTED DUPLICATE DOCUMENT\n');
    console.log('='.repeat(80) + '\n');

    // Get Yonwaba's merged record to see what was merged from the corrupted doc
    const yonwabaQuery = await db.collection('nominations')
      .where('nomineeName', '==', 'Yonwaba')
      .get();

    const yonwaba = yonwabaQuery.docs[0];
    const yonwabaData = yonwaba.data();

    console.log('📄 Source: Yonwaba\'s merged record');
    console.log(`  mergedFromCorrupted: ${yonwabaData.mergedFromCorrupted}`);
    console.log(`  corruptedSourceId: ${yonwabaData.corruptedSourceId}\n`);

    // The corrupted doc had incomplete data but the answers and files were merged
    // Let's reconstruct it from what we know:
    const corruptedDoc = {
      categoryId: 'entrepreneur',
      categoryName: 'Student Entrepreneurship Award',
      nomineeName: '[object Object]', // This was the corruption
      nomineeEmail: '', // Was empty
      studentNumber: '',
      faculty: '',
      yearOfStudy: '',
      nominatorName: '',
      nominatorEmail: '',
      nominatorRelationship: '',
      isSelfNomination: false,
      status: 'pending',
      createdAt: yonwabaData.createdAt,
      updatedAt: yonwabaData.updatedAt,
      // The answers and uploads that were merged
      answers: yonwabaData.answers,
      uploads: yonwabaData.uploads
    };

    console.log('🔄 RESTORING DOCUMENT e8KIkGYopWLUBpEoVj20...\n');

    // Restore the document
    await db.collection('nominations').doc('e8KIkGYopWLUBpEoVj20').set(corruptedDoc);

    console.log('✅ CORRUPTED DOCUMENT RESTORED!\n');
    console.log('Document Details:');
    console.log(`  ID: e8KIkGYopWLUBpEoVj20`);
    console.log(`  Category: ${corruptedDoc.categoryId}`);
    console.log(`  Name: ${corruptedDoc.nomineeName} (corrupted)`);
    console.log(`  Email: (empty)`);
    console.log(`  Answers: ${Object.keys(corruptedDoc.answers).length}`);
    
    let fileCount = 0;
    for (const [q, slots] of Object.entries(corruptedDoc.uploads || {})) {
      for (const [s, files] of Object.entries(slots)) {
        if (Array.isArray(files)) fileCount += files.length;
      }
    }
    console.log(`  Files: ${fileCount}\n`);

    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
