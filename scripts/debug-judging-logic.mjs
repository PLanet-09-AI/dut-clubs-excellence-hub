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

// Simulate the getNominationJudgingStatus logic
function getNominationJudgingStatus(nomId, categoryId, allScores) {
  // Get unique active judges
  const activeJudges = new Set(allScores.map(s => s.judgeUid)).size;
  
  // Get judges who completed scoring for THIS nomination
  const nomScores = allScores.filter(s => s.nominationId === nomId);
  const completedJudges = nomScores.filter(s => {
    const criteria = s.criteriaScores || {};
    const allFilled = Object.values(criteria).every(v => typeof v === 'number' && v > 0);
    return allFilled;
  }).length;
  
  console.log(`  Nomination ${nomId}:`);
  console.log(`    Active judges: ${activeJudges}`);
  console.log(`    Scores for this nom: ${nomScores.length}`);
  console.log(`    Completed: ${completedJudges}`);
  console.log(`    Status: ${activeJudges > 0 && completedJudges === activeJudges ? 'COMPLETE' : 'PENDING'}`);
  
  return activeJudges > 0 && completedJudges === activeJudges ? 'complete' : 'pending';
}

async function analyzeJudgingLogic() {
  console.log('\n🔍 Analyzing Judging Status Logic\n');
  
  try {
    // Get all nominations
    const nomsSnap = await db.collection('nominations').where('status', '==', 'shortlisted').get();
    const nominations = [];
    nomsSnap.forEach(doc => {
      nominations.push({ id: doc.id, name: doc.data().name, categoryId: doc.data().categoryId });
    });

    // Get all judge scores
    const scoresSnap = await db.collection('judge_scores').get();
    const allScores = [];
    scoresSnap.forEach(doc => {
      allScores.push(doc.data());
    });

    console.log(`📋 Total nominations: ${nominations.length}`);
    console.log(`📊 Total judge scores: ${allScores.length}`);
    console.log(`👨‍⚖️ Unique judges: ${new Set(allScores.map(s => s.judgeUid)).size}\n`);

    // Check each nomination
    const pending = [];
    const complete = [];

    for (const nom of nominations) {
      const status = getNominationJudgingStatus(nom.id, nom.categoryId, allScores);
      if (status === 'pending') {
        pending.push(nom);
      } else {
        complete.push(nom);
      }
    }

    console.log(`\n📊 RESULTS:\n`);
    console.log(`✅ Complete: ${complete.length}`);
    console.log(`⏳ Pending: ${pending.length}\n`);

    if (pending.length > 0 && pending.length <= 20) {
      console.log('⏳ PENDING NOMINATIONS:\n');
      pending.forEach(nom => {
        console.log(`${nom.name || `[No Name - ${nom.id}]`}`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

analyzeJudgingLogic();
