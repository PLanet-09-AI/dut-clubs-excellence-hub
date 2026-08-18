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

async function inspectScoreStructure() {
  console.log('\n🔍 Inspecting Score Structure for Pending Nominations\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    // The 9 pending nominations from the logs
    const pendingNomIds = [
      'woQOU9JgafRS2QtWPuje',
      'rI7yiT3ZLvHLhm3p1qUg',
      'q7zPn9maPkoGdHxFWR0t',
      'Voel0XLjBsWjwE051iM9',
      'Tw4an3N3PlklOiQ8FRii',
      'TlsUMouy2hz0xeTEhNbg',
      'KYfvxdAMzE782UUkj5Q7',
      'KK3bCIiCkW0o4oBzpYfK',
      '9kec5j7aLo9lul3rJmCy'
    ];

    // Get the first pending nomination
    const nomId = pendingNomIds[0];
    console.log(`Checking nomination: ${nomId}\n`);

    // Get all scores for this nomination
    const scoresSnap = await db.collection('judge_scores')
      .where('nominationId', '==', nomId)
      .get();

    console.log(`Found ${scoresSnap.size} score documents:\n`);

    scoresSnap.forEach((doc, idx) => {
      const score = doc.data();
      console.log(`${idx + 1}. Judge: ${score.judgeEmail}`);
      console.log(`   Score doc structure:`);
      console.log(`   - score: ${score.score}`);
      console.log(`   - comment: ${score.comment ? '✓ has comment' : '✗ no comment'}`);
      console.log(`   - criteriaScores type: ${typeof score.criteriaScores}`);
      console.log(`   - criteriaScores: ${JSON.stringify(score.criteriaScores, null, 2)}`);
      
      // Check if any criteria are 0 or missing
      if (score.criteriaScores) {
        const criteria = Object.entries(score.criteriaScores);
        const zeroValues = criteria.filter(([k, v]) => v === 0);
        const missingValues = criteria.filter(([k, v]) => v === undefined || v === null);
        
        if (zeroValues.length > 0) {
          console.log(`   ⚠️  ${zeroValues.length} criteria have 0 rating`);
        }
        if (missingValues.length > 0) {
          console.log(`   ⚠️  ${missingValues.length} criteria are missing/null`);
        }
      } else {
        console.log(`   ❌ criteriaScores field is MISSING/undefined`);
      }
      console.log();
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

inspectScoreStructure();
