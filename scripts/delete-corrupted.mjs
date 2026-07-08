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

try {
  console.log('🔍 Fetching corrupted and clean nominations...\n');
  
  // Get corrupted doc
  const corruptedRef = db.collection('nominations').doc('e8KIkGYopWLUBpEoVj20');
  const corruptedSnap = await corruptedRef.get();
  
  if (!corruptedSnap.exists) {
    console.log('ℹ️  Corrupted document not found - already deleted.\n');
    process.exit(0);
  }
  
  const corruptedData = corruptedSnap.data();
  console.log('📄 CORRUPTED DOCUMENT:');
  console.log('  ID:', corruptedSnap.id);
  console.log('  nomineeName:', corruptedData?.nomineeName || '(empty)');
  console.log('  nomineeEmail:', corruptedData?.nomineeEmail || '(empty)');
  console.log('  categoryId:', corruptedData?.categoryId || '(empty)');
  console.log('  Uploads count:', Object.keys(corruptedData?.uploads || {}).length);
  
  // List all entrepreneur nominations to find Yonwaba
  console.log('\n📋 Searching for entrepreneur category nominations...');
  const allEntrepreneur = await db.collection('nominations')
    .where('categoryId', '==', 'entrepreneur')
    .get();
  
  console.log(`  Found ${allEntrepreneur.docs.length} entrepreneur nominations:`);
  allEntrepreneur.docs.forEach(doc => {
    const data = doc.data();
    console.log(`    - ${data.nomineeName || '(empty)'} / ${data.nomineeEmail || '(empty)'}`);
  });
  
  // If only one other exists besides corrupted, use it
  if (allEntrepreneur.docs.length === 3) {
    const yonwabaSnap = allEntrepreneur.docs.find(doc => 
      doc.data().nomineeName === 'Yonwaba' && 
      doc.data().nomineeEmail === '22252145@dut4life.ac.za'
    );
    
    if (!yonwabaSnap) {
      console.log('\n❌ Could not find Yonwaba\'s nomination\n');
      process.exit(1);
    }
    
    const yonwabaData = yonwabaSnap.data();
    
    console.log('\n📄 YONWABA\'S CLEAN NOMINATION:');
    console.log('  ID:', yonwabaSnap.id);
    console.log('  nomineeName:', yonwabaData.nomineeName);
    console.log('  nomineeEmail:', yonwabaData.nomineeEmail);
    console.log('  categoryId:', yonwabaData.categoryId);
    console.log('  Uploads count:', Object.keys(yonwabaData.uploads || {}).length);
    console.log('  Answer keys:', Object.keys(yonwabaData.answers || {}));
    
    // Merge corrupted data into clean
    console.log('\n🔀 MERGING DATA...');
    const mergedData = {
      ...yonwabaData,
      // Use corrupted answers - they have content
      answers: {
        ...yonwabaData.answers,
        ...corruptedData?.answers
      },
      // Merge uploads
      uploads: {
        ...yonwabaData.uploads,
        ...corruptedData?.uploads
      },
      mergedFromCorrupted: true,
      mergedAt: Timestamp.now(),
      corruptedSourceId: 'e8KIkGYopWLUBpEoVj20'
    };
    
    console.log('  Answers before merge:', Object.keys(yonwabaData.answers || {}).length);
    console.log('  Answers after merge:', Object.keys(mergedData.answers).length);
    console.log('  Files before merge:', Object.keys(yonwabaData.uploads || {}).length);
    console.log('  Files after merge:', Object.keys(mergedData.uploads).length);
    
    // Update Yonwaba's document
    await yonwabaSnap.ref.update(mergedData);
    console.log('\n✅ Updated Yonwaba\'s nomination with merged data');
    
    // Delete corrupted doc
    await corruptedRef.delete();
    console.log('✅ Deleted corrupted document e8KIkGYopWLUBpEoVj20\n');
    
    console.log('🎉 MERGE COMPLETE!');
    console.log('   Yonwaba\'s nomination is now unified with all available data.\n');
  } else {
    console.log('\n❌ Expected exactly 3 entrepreneur nominations, found:', allEntrepreneur.docs.length);
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
