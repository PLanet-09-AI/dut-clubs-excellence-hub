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

async function sendJudgeNotifications() {
  console.log('\n📧 Creating Judge Incomplete Submission Notifications\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    // Get all judge scores
    const scoresSnap = await db.collection('judge_scores').get();
    const allScores = scoresSnap.docs.map(d => d.data());

    const AWARD_CATEGORIES = [
      { id: "dean", name: "Leadership: Dean's Award", criteria: ["dean-a1", "dean-b1", "dean-c1", "dean-d1", "dean-g1"] },
      { id: "emerging", name: "Emerging Leader", criteria: ["ent-1", "ent-2", "ent-3", "ent-4", "ent-5"] },
      { id: "sport", name: "Sport & Recreation", criteria: ["sp-1", "sp-2", "sp-3", "sp-4", "sp-5"] },
      { id: "society", name: "Society & Culture", criteria: ["soc-c1", "soc-c2", "soc-c3", "soc-c4", "soc-c5", "soc-c6"] },
      { id: "diversity", name: "Diversity & Inclusion", criteria: ["div-1", "div-2", "div-3", "div-4", "div-5"] },
      { id: "residence", name: "Residence", criteria: ["res-1", "res-2", "res-3", "res-4", "res-5"] },
    ];

    function getCriteriaForCategory(categoryId) {
      const cat = AWARD_CATEGORIES.find(c => c.id === categoryId);
      return cat ? cat.criteria : [];
    }

    // Group incomplete by judge
    const incompleteByJudge = {};

    for (const score of allScores) {
      const judgeEmail = score.judgeEmail;
      const categoryId = score.categoryId;
      const criteria = getCriteriaForCategory(categoryId);
      const criteriaScores = score.criteriaScores || {};
      
      const missingCriteria = criteria.filter(c => !criteriaScores[c] || criteriaScores[c] === 0);
      
      if (missingCriteria.length > 0) {
        if (!incompleteByJudge[judgeEmail]) {
          incompleteByJudge[judgeEmail] = [];
        }
        incompleteByJudge[judgeEmail].push({
          nominationId: score.nominationId,
          nomineeName: score.nomineeName,
          categoryId: categoryId,
          missingCriteria: missingCriteria,
          totalMissing: missingCriteria.length,
          totalCriteria: criteria.length
        });
      }
    }

    // Create notifications collection with judge completion status
    let notificationCount = 0;
    for (const [judgeEmail, incomplete] of Object.entries(incompleteByJudge)) {
      await db.collection('judge_notifications').doc(judgeEmail).set({
        judgeEmail: judgeEmail,
        incompleteCount: incomplete.length,
        incompleteNominations: incomplete,
        createdAt: new Date(),
        updatedAt: new Date(),
        read: false
      }, { merge: true });
      
      notificationCount++;
      console.log(`✅ ${judgeEmail}: ${incomplete.length} incomplete nominations`);
    }

    console.log(`\n📧 Created notifications for ${notificationCount} judges`);
    console.log('=' .repeat(80));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

sendJudgeNotifications();
