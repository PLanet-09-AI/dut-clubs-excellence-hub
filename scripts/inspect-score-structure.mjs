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

async function inspectJudgeScoreStructure() {
  console.log('\n🔍 Inspecting Judge Score Document Structure\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    // Get some sample judge scores
    const scoresSnap = await db.collection('judge_scores').limit(20).get();
    
    console.log(`📋 Sampling ${scoresSnap.size} judge score documents:\n`);

    scoresSnap.forEach((doc, idx) => {
      const data = doc.data();
      console.log(`${idx + 1}. Document ID: ${doc.id}`);
      console.log(`   Nominee: ${data.nomineeName}`);
      console.log(`   Judge: ${data.judgeEmail}`);
      console.log(`   Category: ${data.categoryId}`);
      console.log(`   Fields present: ${Object.keys(data).join(', ')}`);
      console.log(`   score field: ${data.score} (type: ${typeof data.score})`);
      console.log(`   overallScore field: ${data.overallScore} (type: ${typeof data.overallScore})`);
      
      if (data.criteriaScores) {
        const criteria = Object.entries(data.criteriaScores);
        console.log(`   criteriaScores: ${criteria.length} entries`);
        criteria.forEach(([key, val]) => {
          console.log(`      - ${key}: ${val}`);
        });
      } else {
        console.log(`   criteriaScores: MISSING`);
      }
      
      console.log();
    });

    // Get one complete picture
    const fullSnap = await db.collection('judge_scores').get();
    const fullData = [];
    
    fullSnap.forEach((doc) => {
      fullData.push(doc.data());
    });

    console.log('=' .repeat(80));
    console.log('\n📊 ANALYSIS OF ALL SCORES:\n');
    
    const hasScore = fullData.filter(s => s.score !== undefined && s.score !== null).length;
    const hasOverallScore = fullData.filter(s => s.overallScore !== undefined && s.overallScore !== null).length;
    const hasCriteria = fullData.filter(s => s.criteriaScores && Object.keys(s.criteriaScores).length > 0).length;
    
    console.log(`Total scores: ${fullData.length}`);
    console.log(`Has 'score' field: ${hasScore}`);
    console.log(`Has 'overallScore' field: ${hasOverallScore}`);
    console.log(`Has 'criteriaScores' with entries: ${hasCriteria}`);
    console.log();

    // Check for incomplete ones
    const incomplete = fullData.filter(s => {
      if (!s.criteriaScores) return true;
      const filled = Object.values(s.criteriaScores).filter(v => v > 0).length;
      const total = Object.keys(s.criteriaScores).length;
      return filled < total;
    });

    console.log(`Incomplete scores (missing criteria): ${incomplete.length}\n`);
    
    if (incomplete.length > 0 && incomplete.length <= 20) {
      console.log('Incomplete score details:\n');
      incomplete.forEach((score) => {
        console.log(`Judge: ${score.judgeEmail}`);
        console.log(`Nomination: ${score.nomineeName}`);
        console.log(`Criteria:`,  score.criteriaScores);
        console.log();
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

inspectJudgeScoreStructure();
