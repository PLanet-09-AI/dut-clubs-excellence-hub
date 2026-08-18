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

async function debugPendingJudging() {
  console.log('\n🔍 Debugging "Pending Judging" Discrepancy\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    // Get all judge scores
    const scoresSnap = await db.collection('judge_scores').get();
    const allScores = scoresSnap.docs.map(d => d.data());

    // Count unique judges globally (like getActivejudgeCount does)
    const activeJudges = new Set(allScores.map(s => s.judgeUid));
    console.log(`Active Judges in System: ${activeJudges.size}\n`);
    Array.from(activeJudges).forEach(j => console.log(`  - ${j}`));

    // Get all shortlisted nominations
    const nomsSnap = await db.collection('nominations')
      .where('status', '==', 'shortlisted')
      .get();
    
    console.log(`\n\nAnalyzing ${nomsSnap.size} Shortlisted Nominations:\n`);
    console.log('=' .repeat(80) + '\n');

    let pendingCount = 0;
    const pendingNoms = [];

    for (const nomDoc of nomsSnap.docs) {
      const nom = nomDoc.data();
      const nomId = nomDoc.id;
      
      // Get scores for this nomination
      const nomScores = allScores.filter(s => s.nominationId === nomId);
      
      // Get judges with completed scores for this nomination
      const completedJudgeUids = new Set(
        nomScores
          .filter(s => {
            // Check if all criteria are rated (no 0s)
            const criteriaScores = s.criteriaScores || {};
            return Object.values(criteriaScores).every(v => typeof v === 'number' && v > 0);
          })
          .map(s => s.judgeUid)
      );

      // Compare: if completedJudges !== activeJudges, it's marked as pending
      if (completedJudgeUids.size !== activeJudges.size) {
        pendingCount++;
        
        // Which judges haven't completed?
        const missingJudges = Array.from(activeJudges).filter(j => !completedJudgeUids.has(j));
        
        pendingNoms.push({
          name: nom.nomineeName,
          category: nom.categoryId,
          completed: completedJudgeUids.size,
          total: activeJudges.size,
          missing: missingJudges
        });
      }
    }

    console.log(`PENDING NOMINATIONS: ${pendingCount}\n`);
    
    if (pendingCount > 0) {
      pendingNoms.forEach((nom, idx) => {
        console.log(`${idx + 1}. ${nom.name} (${nom.category})`);
        console.log(`   Completed: ${nom.completed}/${nom.total} judges`);
        console.log(`   Missing scores from:`);
        nom.missing.forEach(j => console.log(`     - ${j}`));
        console.log();
      });
    }

    console.log('=' .repeat(80) + '\n');
    if (pendingCount === 0) {
      console.log('✅ NO PENDING NOMINATIONS - All shortlisted fully judged');
    } else {
      console.log(`⚠️  ${pendingCount} nominations missing scores from specific judges`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

debugPendingJudging();
