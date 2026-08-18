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

async function findTrulyPendingNominations() {
  console.log('\n📊 Finding Nominations with INCOMPLETE Judge Coverage\n');
  console.log('=' .repeat(80) + '\n');

  try {
    // Get all judges from scores
    const allScoresSnap = await db.collection('judge_scores').get();
    const judgeEmailsSet = new Set();
    
    allScoresSnap.forEach((doc) => {
      const score = doc.data();
      if (score.judgeEmail) {
        judgeEmailsSet.add(score.judgeEmail);
      }
    });

    const judges = Array.from(judgeEmailsSet);
    const totalJudges = judges.length;

    console.log(`👨‍⚖️ Total Judges: ${totalJudges}`);
    judges.forEach((j) => console.log(`   • ${j}`));
    console.log();

    // Get ALL shortlisted nominations
    const nominationsSnap = await db
      .collection('nominations')
      .where('status', '==', 'shortlisted')
      .get();

    const nominations = [];
    nominationsSnap.forEach((doc) => {
      nominations.push({
        id: doc.id,
        name: doc.data().name,
        category: doc.data().categoryId,
        nomineeEmail: doc.data().nomineeEmail,
      });
    });

    console.log(`📋 Total Shortlisted Nominations: ${nominations.length}\n`);

    // Build score map
    const scoresByNomination = {};
    allScoresSnap.forEach((doc) => {
      const score = doc.data();
      const nomId = score.nominationId;
      
      if (!scoresByNomination[nomId]) {
        scoresByNomination[nomId] = [];
      }
      
      scoresByNomination[nomId].push({
        judgeEmail: score.judgeEmail,
        overallScore: score.overallScore,
      });
    });

    // Find nominations with incomplete coverage
    const pendingNominations = [];
    const completeNominations = [];

    nominations.forEach((nom) => {
      const scoresForNom = scoresByNomination[nom.id] || [];
      const judgesWhoScored = scoresForNom.map(s => s.judgeEmail);
      const judgesWhoPending = judges.filter(j => !judgesWhoScored.includes(j));

      if (judgesWhoPending.length > 0) {
        pendingNominations.push({
          name: nom.name,
          id: nom.id,
          category: nom.category,
          totalJudges,
          judgesScored: judgesWhoScored.length,
          judgesPending: judgesWhoPending.length,
          judgesWhoScored,
          judgesWhoPending,
        });
      } else {
        completeNominations.push(nom);
      }
    });

    // Report
    console.log('🔍 RESULTS\n');
    console.log(`✅ Complete (all judges scored): ${completeNominations.length}`);
    console.log(`⏳ PENDING (missing judges): ${pendingNominations.length}\n`);

    if (pendingNominations.length > 0) {
      console.log('=' .repeat(80));
      console.log('\n⏳ NOMINATIONS PENDING JUDGE COMPLETION\n');
      
      pendingNominations.forEach((nom, idx) => {
        console.log(`${idx + 1}. ${nom.name}`);
        console.log(`   Category: ${nom.category}`);
        console.log(`   Progress: ${nom.judgesScored}/${nom.totalJudges} judges`);
        console.log(`   ✅ Scored by:`);
        nom.judgesWhoScored.forEach(email => console.log(`      • ${email}`));
        console.log(`   ⏳ PENDING from:`);
        nom.judgesWhoPending.forEach(email => console.log(`      • ${email}`));
        console.log();
      });

      // Summary by judge
      console.log('\n' + '=' .repeat(80));
      console.log('\n👨‍⚖️ REMINDERS NEEDED BY JUDGE\n');

      const judgeReminders = {};
      judges.forEach(j => {
        judgeReminders[j] = [];
      });

      pendingNominations.forEach((nom) => {
        nom.judgesWhoPending.forEach(judge => {
          judgeReminders[judge].push(nom.name);
        });
      });

      Object.entries(judgeReminders)
        .filter(([_, noms]) => noms.length > 0)
        .forEach(([judge, noms]) => {
          console.log(`${judge}`);
          console.log(`   Pending: ${noms.length} nominations`);
          noms.forEach(nom => console.log(`      • ${nom}`));
          console.log();
        });
    } else {
      console.log('✅ ALL NOMINATIONS FULLY JUDGED - No reminders needed!\n');
    }

    // Save report
    fs.writeFileSync(
      './scripts/pending-judging-report.json',
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalJudges,
        totalShortlisted: nominations.length,
        completeCount: completeNominations.length,
        pendingCount: pendingNominations.length,
        pendingNominations,
      }, null, 2)
    );

    console.log('✅ Report saved to scripts/pending-judging-report.json\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

findTrulyPendingNominations();
