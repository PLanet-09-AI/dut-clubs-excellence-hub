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

async function checkScoreCompleteness() {
  console.log('\n🔍 Checking Score Completeness (Criteria All Filled In)\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    // Get all judge scores
    const scoresSnap = await db.collection('judge_scores').get();
    const allScores = [];
    
    scoresSnap.forEach((doc) => {
      const score = doc.data();
      allScores.push({
        id: doc.id,
        nominationId: score.nominationId,
        judgeEmail: score.judgeEmail,
        categoryId: score.categoryId,
        overallScore: score.overallScore,
        criteriaScores: score.criteriaScores || {},
        criteriaCount: Object.keys(score.criteriaScores || {}).length,
        filledCount: Object.values(score.criteriaScores || {}).filter(v => v > 0).length,
      });
    });

    console.log(`📊 Total Judge Scores: ${allScores.length}\n`);

    // Group by nomination
    const byNomination = {};
    allScores.forEach((score) => {
      if (!byNomination[score.nominationId]) {
        byNomination[score.nominationId] = [];
      }
      byNomination[score.nominationId].push(score);
    });

    // Find nominations where scores aren't complete
    const incompleteScoringNoms = [];
    
    Object.entries(byNomination).forEach(([nomId, scores]) => {
      const hasIncompleteScore = scores.some(s => {
        const scoreCount = Object.keys(s.criteriaScores).filter(k => s.criteriaScores[k] > 0).length;
        const totalCriteria = Object.keys(s.criteriaScores).length;
        return scoreCount < totalCriteria;
      });
      
      if (hasIncompleteScore) {
        incompleteScoringNoms.push({
          nominationId: nomId,
          scores: scores.map(s => ({
            judgeEmail: s.judgeEmail,
            overallScore: s.overallScore,
            filledCriteria: s.filledCount,
            totalCriteria: s.criteriaCount,
            criteriaStatus: Object.entries(s.criteriaScores)
              .map(([key, val]) => `${key}: ${val || 'empty'}`)
              .join(', '),
          })),
        });
      }
    });

    console.log(`🔴 Nominations with Incomplete Scoring: ${incompleteScoringNoms.length}\n`);
    
    if (incompleteScoringNoms.length > 0) {
      console.log('📋 NOMINATIONS WITH MISSING CRITERIA RATINGS:\n');
      
      incompleteScoringNoms.slice(0, 15).forEach((nom, idx) => {
        console.log(`${idx + 1}. Nomination: ${nom.nominationId}`);
        nom.scores.forEach((score) => {
          const complete = score.filledCriteria === score.totalCriteria ? '✅' : '⏳';
          console.log(`   ${complete} ${score.judgeEmail}: ${score.filledCriteria}/${score.totalCriteria} criteria`);
          if (score.filledCriteria < score.totalCriteria) {
            console.log(`      Criteria: ${score.criteriaStatus.substring(0, 100)}...`);
          }
        });
        console.log();
      });

      if (incompleteScoringNoms.length > 15) {
        console.log(`... and ${incompleteScoringNoms.length - 15} more nominations with incomplete scoring\n`);
      }
    } else {
      console.log('✅ All scores have all criteria filled in!\n');
    }

    // Summary stats
    console.log('=' .repeat(80));
    console.log('\n📊 SCORE COMPLETION STATISTICS:\n');
    
    const completeScores = allScores.filter(s => {
      const totalCriteria = Object.keys(s.criteriaScores).length;
      const filledCriteria = Object.values(s.criteriaScores).filter(v => v > 0).length;
      return filledCriteria === totalCriteria && totalCriteria > 0;
    });

    const incompleteScores = allScores.filter(s => {
      const totalCriteria = Object.keys(s.criteriaScores).length;
      const filledCriteria = Object.values(s.criteriaScores).filter(v => v > 0).length;
      return filledCriteria < totalCriteria;
    });

    console.log(`✅ Complete scores (all criteria filled): ${completeScores.length}`);
    console.log(`⏳ Incomplete scores (missing criteria): ${incompleteScores.length}`);
    console.log(`📋 Total nominations with scores: ${Object.keys(byNomination).length}\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkScoreCompleteness();
