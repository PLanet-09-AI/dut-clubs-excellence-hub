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

async function analyzeAll() {
  console.log('\n📊 COMPREHENSIVE NOMINATION ANALYSIS\n');
  
  try {
    // Get ALL nominations regardless of status
    const allNomsSnap = await db.collection('nominations').get();
    
    const statusCount = {};
    const allNoms = [];
    
    allNomsSnap.forEach((doc) => {
      const data = doc.data();
      const status = data.status;
      statusCount[status] = (statusCount[status] || 0) + 1;
      
      allNoms.push({
        id: doc.id,
        name: data.name,
        status,
        category: data.categoryId,
      });
    });

    console.log('📊 ALL NOMINATIONS BY STATUS:\n');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });

    console.log(`\nTotal: ${allNomsSnap.size}\n`);

    // Now get ALL judge scores
    const allScoresSnap = await db.collection('judge_scores').get();
    console.log(`📈 Total Judge Scores Recorded: ${allScoresSnap.size}\n`);

    // Count scores per nomination
    const scoresByNom = {};
    allScoresSnap.forEach((doc) => {
      const nomId = doc.data().nominationId;
      scoresByNom[nomId] = (scoresByNom[nomId] || 0) + 1;
    });

    // Count how many unique judges
    const judgeEmails = new Set();
    allScoresSnap.forEach((doc) => {
      const email = doc.data().judgeEmail;
      if (email) judgeEmails.add(email);
    });
    
    const totalJudges = judgeEmails.size;
    console.log(`👨‍⚖️ Total Unique Judges: ${totalJudges}\n`);

    // Find nominations with incomplete judging
    const shortlistedNoms = allNoms.filter(n => n.status === 'shortlisted');
    console.log(`✅ SHORTLISTED NOMINATIONS: ${shortlistedNoms.length}\n`);

    const nomsWithoutFullScores = shortlistedNoms.filter(nom => {
      const scores = scoresByNom[nom.id] || 0;
      return scores < totalJudges;
    });

    console.log(`📊 SCORE COVERAGE:\n`);
    console.log(`   Fully judged (${totalJudges}/${totalJudges} scores): ${shortlistedNoms.length - nomsWithoutFullScores.length}`);
    console.log(`   Incomplete judging (<${totalJudges} scores): ${nomsWithoutFullScores.length}\n`);

    if (nomsWithoutFullScores.length > 0) {
      console.log('⏳ NOMINATIONS WITH INCOMPLETE JUDGING:\n');
      nomsWithoutFullScores.forEach((nom) => {
        const scores = scoresByNom[nom.id] || 0;
        console.log(`${nom.name} - ${scores}/${totalJudges} judges`);
      });
    } else {
      console.log('✅ All shortlisted nominations have been judged by all judges!\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

analyzeAll();
