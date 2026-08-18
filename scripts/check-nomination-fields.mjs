import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json', 'utf8')
);

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://student-services-745d5.firebaseio.com',
});

const db = getFirestore(app);

async function checkNominationFields() {
  console.log('\n🔍 Checking Nomination Fields\n');
  
  try {
    const nomsSnap = await db
      .collection('nominations')
      .where('status', '==', 'shortlisted')
      .limit(20)
      .get();

    console.log(`📋 Sampling first 20 shortlisted nominations:\n`);
    
    nomsSnap.forEach((doc, idx) => {
      const data = doc.data();
      console.log(`${idx + 1}. ${data.name || '[No Name]'}`);
      console.log(`   Fields: ${Object.keys(data).sort().join(', ')}`);
      
      // Check for any fields related to judging status
      const relevantFields = Object.entries(data)
        .filter(([key]) => 
          key.toLowerCase().includes('judg') || 
          key.toLowerCase().includes('pending') ||
          key.toLowerCase().includes('status') ||
          key.toLowerCase().includes('complete')
        );
      
      if (relevantFields.length > 0) {
        console.log(`   🎯 Relevant fields:`);
        relevantFields.forEach(([key, val]) => {
          console.log(`      - ${key}: ${JSON.stringify(val)}`);
        });
      }
      console.log();
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkNominationFields();
