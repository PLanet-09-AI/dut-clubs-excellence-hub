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
  console.log('='.repeat(100));
  console.log('🔍 CHECKING FIREBASE STORAGE FOR ORPHANED FILES');
  console.log('='.repeat(100) + '\n');

  // Get Yonwaba's record
  const yonwabaQuery = await db.collection('nominations')
    .where('nomineeName', '==', 'Yonwaba')
    .where('categoryId', '==', 'entrepreneur')
    .get();

  const yonwabaDoc = yonwabaQuery.docs[0];
  const yonwabaData = yonwabaDoc.data();

  console.log('📄 YONWABA\'S RECORD:');
  console.log(`  ID: ${yonwabaDoc.id}`);
  console.log(`  Email: ${yonwabaData.nomineeEmail}\n`);

  // Get all files referenced in database
  const dbFiles = new Set();
  for (const [question, slots] of Object.entries(yonwabaData.uploads || {})) {
    for (const [slot, files] of Object.entries(slots)) {
      if (Array.isArray(files)) {
        for (const file of files) {
          if (file.path) {
            dbFiles.add(file.path);
          }
        }
      }
    }
  }

  console.log(`📊 Files in database: ${dbFiles.size}\n`);
  console.log('📁 Listing all files in Firebase Storage for Yonwaba:\n');

  // List all files in Storage under Yonwaba's path
  // The path should be: nominations/entrepreneur/06c89254-fffd-46a5-b667-3168629fd3dc/
  const [storageFiles] = await bucket.getFiles({
    prefix: 'nominations/entrepreneur/06c89254-fffd-46a5-b667-3168629fd3dc/'
  });

  console.log(`Found ${storageFiles.length} files in Storage\n`);

  let orphanedFiles = [];
  
  for (const file of storageFiles) {
    const fullPath = file.name;
    const fileName = fullPath.split('/').pop();
    const inDb = dbFiles.has(fullPath);
    
    console.log(`  ${inDb ? '✅' : '❌'} ${fileName}`);
    console.log(`     Path: ${fullPath}`);
    
    if (!inDb) {
      orphanedFiles.push({
        name: fileName,
        path: fullPath,
        file: file
      });
    }
  }

  console.log('\n' + '='.repeat(100));
  
  if (orphanedFiles.length > 0) {
    console.log(`\n⚠️  FOUND ${orphanedFiles.length} ORPHANED FILE(S) NOT IN DATABASE!\n`);
    
    for (const orphan of orphanedFiles) {
      console.log(`  🔗 ${orphan.name}`);
      console.log(`     Path: ${orphan.path}`);
      console.log(`     Storage URL: https://firebasestorage.googleapis.com/v0/b/student-services-745d5.firebasestorage.app/o/${encodeURIComponent(orphan.path)}?alt=media\n`);
    }

    console.log('💾 ADDING ORPHANED FILES TO YONWABA\'S RECORD...\n');

    // Parse the path to determine question and slot
    // Path format: nominations/entrepreneur/UUID/ent-X/eY/filename
    for (const orphan of orphanedFiles) {
      const parts = orphan.path.split('/');
      if (parts.length >= 5) {
        const question = parts[3]; // ent-X
        const slot = parts[4];      // eY
        
        console.log(`  Adding to ${question}/${slot}: ${orphan.name}`);

        // Get the metadata from storage
        const [metadata] = await orphan.file.getMetadata();
        
        // Create file object
        const fileObj = {
          name: orphan.name,
          url: `https://firebasestorage.googleapis.com/v0/b/student-services-745d5.firebasestorage.app/o/${encodeURIComponent(orphan.path)}?alt=media&token=${metadata.metadata?.token || 'unknown'}`,
          size: metadata.size || 0,
          path: orphan.path
        };

        // Initialize uploads structure if needed
        if (!yonwabaData.uploads) yonwabaData.uploads = {};
        if (!yonwabaData.uploads[question]) yonwabaData.uploads[question] = {};
        if (!Array.isArray(yonwabaData.uploads[question][slot])) {
          yonwabaData.uploads[question][slot] = [];
        }

        // Check if file already exists
        const exists = yonwabaData.uploads[question][slot].some(f => f.name === orphan.name);
        if (!exists) {
          yonwabaData.uploads[question][slot].push(fileObj);
        }
      }
    }

    // Update the database
    await db.collection('nominations').doc(yonwabaDoc.id).update({
      uploads: yonwabaData.uploads,
      updatedAt: new Date()
    });

    console.log('\n✅ ORPHANED FILES ADDED TO YONWABA\'S RECORD!\n');

    // Recount files
    let newTotal = 0;
    for (const [question, slots] of Object.entries(yonwabaData.uploads || {})) {
      for (const [slot, files] of Object.entries(slots)) {
        if (Array.isArray(files)) {
          newTotal += files.length;
        }
      }
    }

    console.log('='.repeat(100));
    console.log(`\n📊 FINAL FILE COUNT:\n`);
    console.log(`  Before: 11 files`);
    console.log(`  Found in storage: ${orphanedFiles.length} orphaned file(s)`);
    console.log(`  After: ${newTotal} files ✅\n`);

  } else {
    console.log('\n✅ NO ORPHANED FILES FOUND\n');
    console.log('All files in Storage are accounted for in the database.');
    console.log(`Total files: ${storageFiles.length}\n`);
  }

  console.log('='.repeat(100) + '\n');

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
