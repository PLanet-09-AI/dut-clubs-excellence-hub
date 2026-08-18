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

async function findPendingNominationsMatching() {
  console.log('\n🔍 Finding 9 "Pending Judging" Nominations in Firestore\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    // Get all shortlisted nominations
    const nomsSnap = await db
      .collection('nominations')
      .where('status', '==', 'shortlisted')
      .get();

    const nominations = [];
    nomsSnap.forEach((doc) => {
      nominations.push({
        id: doc.id,
        name: doc.data().name,
        category: doc.data().categoryId,
        createdAt: doc.data().createdAt,
      });
    });

    // Get all judge scores
    const scoresSnap = await db.collection('judge_scores').get();
    const nominationIdsWithScores = new Set();
    
    scoresSnap.forEach((doc) => {
      nominationIdsWithScores.add(doc.data().nominationId);
    });

    console.log(`📋 Total shortlisted nominations: ${nominations.length}`);
    console.log(`📊 Nominations with at least 1 score: ${nominationIdsWithScores.size}\n`);

    // Find which nominations DON'T have scores
    const nominationsWithoutScores = nominations.filter(n => !nominationIdsWithScores.has(n.id));
    
    console.log(`❌ Nominations with NO judge scores: ${nominationsWithoutScores.length}\n`);

    if (nominationsWithoutScores.length > 0) {
      console.log('📋 NOMINATIONS WITH NO SCORES (These would appear as "Pending Judging"):\n');
      nominationsWithoutScores.forEach((nom, idx) => {
        console.log(`${idx + 1}. ${nom.name || `[No Name - ID: ${nom.id}]`}`);
        console.log(`   Category: ${nom.category}`);
        console.log(`   Created: ${nom.createdAt ? new Date(nom.createdAt.toDate()).toLocaleDateString() : 'Unknown'}`);
        console.log();
      });
    }

    // For nominations that DO have scores, verify they're all complete
    console.log('=' .repeat(80));
    console.log('\n✅ NOMINATIONS WITH SCORES - Checking Completeness\n');

    const scoresByNom = {};
    scoresSnap.forEach((doc) => {
      const score = doc.data();
      const nomId = score.nominationId;
      if (!scoresByNom[nomId]) {
        scoresByNom[nomId] = [];
      }
      scoresByNom[nomId].push({
        judgeEmail: score.judgeEmail,
        criteria: score.criteriaScores || {},
      });
    });

    const nomsWithIncompleteScores = [];
    
    Object.entries(scoresByNom).forEach(([nomId, scores]) => {
      const nom = nominations.find(n => n.id === nomId);
      
      const hasIncomplete = scores.some(s => {
        const filled = Object.values(s.criteria).filter(v => v > 0).length;
        const total = Object.keys(s.criteria).length;
        return filled < total;
      });

      if (hasIncomplete) {
        nomsWithIncompleteScores.push({
          ...nom,
          scores,
        });
      }
    });

    console.log(`Nominations with incomplete scoring: ${nomsWithIncompleteScores.length}`);
    console.log(`Nominations with complete scoring: ${Object.keys(scoresByNom).length - nomsWithIncompleteScores.length}\n`);

    // Summary
    console.log('=' .repeat(80));
    console.log('\n📊 VERDICT:\n');
    console.log(`Total shortlisted: ${nominations.length}`);
    console.log(`With no scores: ${nominationsWithoutScores.length}`);
    console.log(`With incomplete scores: ${nomsWithIncompleteScores.length}`);
    console.log(`With complete scores: ${Object.keys(scoresByNom).length - nomsWithIncompleteScores.length}`);
    console.log();
    
    if (nominationsWithoutScores.length === 9) {
      console.log('✅ MATCH FOUND! The 9 "Pending Judging" nominations are the ones WITHOUT any scores.\n');
    } else if (nominationsWithoutScores.length + nomsWithIncompleteScores.length === 9) {
      console.log('✅ MATCH FOUND! The 9 "Pending Judging" nominations have incomplete or missing scores.\n');
    } else {
      console.log(`⚠️  Expected 9 pending, but found ${nominationsWithoutScores.length + nomsWithIncompleteScores.length}.\n`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

findPendingNominationsMatching();
