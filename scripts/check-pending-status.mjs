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

async function checkPendingJudgingStatus() {
  console.log('\n📋 Checking "Pending Judging" Nominations Status\n');
  
  try {
    // Get nominations with status "shortlisted"
    const nominationsSnap = await db
      .collection('nominations')
      .where('status', '==', 'shortlisted')
      .limit(50)
      .get();

    const nominations = [];
    nominationsSnap.forEach((doc) => {
      const data = doc.data();
      nominations.push({
        id: doc.id,
        name: data.name,
        category: data.categoryId,
        status: data.status,
        hasJudgingStarted: data.hasJudgingStarted,
        judgeScore: data.judgeScore,
        additionalFields: Object.keys(data).sort(),
      });
    });

    console.log(`Total shortlisted nominations: ${nominations.length}\n`);
    
    // Show first 10 with all fields
    console.log('📊 Sample Nominations (first 10):\n');
    nominations.slice(0, 10).forEach((nom, idx) => {
      console.log(`${idx + 1}. ${nom.name}`);
      console.log(`   ID: ${nom.id}`);
      console.log(`   Status: ${nom.status}`);
      console.log(`   Category: ${nom.category}`);
      console.log(`   All fields: ${nom.additionalFields.join(', ')}`);
      console.log();
    });

    // Check for any custom "pending_judging" or similar status
    const statusMap = {};
    nominationsSnap.forEach((doc) => {
      const data = doc.data();
      const status = data.status || 'undefined';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 Status Distribution:\n');
    Object.entries(statusMap).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkPendingJudgingStatus();
