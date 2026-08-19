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

// Award categories with criteria
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

async function checkIncompleteJudging() {
  console.log('\n🔍 Checking Current Incomplete Judging Status\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    // Get all judge scores
    const scoresSnap = await db.collection('judge_scores').get();
    const allScores = scoresSnap.docs.map(d => d.data());

    // Get all shortlisted nominations
    const nomsSnap = await db.collection('nominations')
      .where('status', '==', 'shortlisted')
      .get();
    
    console.log(`📊 Analyzing ${nomsSnap.size} shortlisted nominations\n`);

    const incompleteNoms = [];
    const judgesByMissingCriteria = {};

    for (const nomDoc of nomsSnap.docs) {
      const nom = nomDoc.data();
      const nomId = nomDoc.id;
      const categoryId = nom.categoryId;
      const criteria = getCriteriaForCategory(categoryId);

      // Get scores for this nomination
      const nomScores = allScores.filter(s => s.nominationId === nomId);
      
      // Check each score for complete criteria
      for (const score of nomScores) {
        const criteriaScores = score.criteriaScores || {};
        const missingCriteria = criteria.filter(c => !criteriaScores[c] || criteriaScores[c] === 0);
        
        if (missingCriteria.length > 0) {
          const judgeEmail = score.judgeEmail;
          incompleteNoms.push({
            nominationId: nomId,
            nomineeName: nom.nomineeName,
            categoryId: categoryId,
            judgeEmail: judgeEmail,
            missingCriteria: missingCriteria,
            totalMissing: missingCriteria.length,
            totalCriteria: criteria.length
          });

          // Track by judge
          if (!judgesByMissingCriteria[judgeEmail]) {
            judgesByMissingCriteria[judgeEmail] = [];
          }
          judgesByMissingCriteria[judgeEmail].push({
            nomineeName: nom.nomineeName,
            categoryId: categoryId,
            missingCount: missingCriteria.length
          });
        }
      }
    }

    console.log(`⚠️  INCOMPLETE SCORES: ${incompleteNoms.length}\n`);
    
    if (incompleteNoms.length === 0) {
      console.log('✅ All judge scores are complete!\n');
    } else {
      // Group by judge
      console.log('📋 BY JUDGE:\n');
      Object.entries(judgesByMissingCriteria).forEach(([judge, noms]) => {
        console.log(`${judge}:`);
        console.log(`  Total nominations with missing criteria: ${noms.length}`);
        noms.forEach(n => {
          console.log(`    • ${n.nomineeName} (${n.categoryId}): ${n.missingCount} criteria missing`);
        });
        console.log();
      });

      console.log('\n📋 ALL INCOMPLETE SCORES:\n');
      incompleteNoms.forEach((inc, idx) => {
        console.log(`${idx + 1}. ${inc.nomineeName} (${inc.categoryId})`);
        console.log(`   Judge: ${inc.judgeEmail}`);
        console.log(`   Missing: ${inc.totalMissing}/${inc.totalCriteria} criteria`);
        console.log(`   Criteria: ${inc.missingCriteria.join(', ')}`);
        console.log();
      });
    }

    console.log('=' .repeat(80) + '\n');
    console.log(`✅ SUMMARY: ${incompleteNoms.length} incomplete score submissions`);
    console.log(`   Judges affected: ${Object.keys(judgesByMissingCriteria).length}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkIncompleteJudging();
