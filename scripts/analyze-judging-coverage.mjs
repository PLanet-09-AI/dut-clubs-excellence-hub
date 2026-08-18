import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load Firebase credentials
const serviceAccount = JSON.parse(
  fs.readFileSync('./student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json', 'utf8')
);

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://student-services-745d5.firebaseio.com',
});

const db = getFirestore(app);

async function analyzeJudgingCoverage() {
  console.log('\n📊 Analyzing Judging Coverage for 9 Pending Nominations\n');
  console.log('=' .repeat(80) + '\n');

  try {
    // 1. Get all judge_scores to extract real judge emails (not just users collection)
    const allScoresSnap = await db.collection('judge_scores').get();
    const judgeEmailsSet = new Set();
    
    allScoresSnap.forEach((doc) => {
      const score = doc.data();
      if (score.judgeEmail) {
        judgeEmailsSet.add(score.judgeEmail);
      }
    });

    const judges = Array.from(judgeEmailsSet).map(email => ({
      email,
      name: email.split('@')[0],
    }));

    console.log(`👨‍⚖️ Total Judges (from scores): ${judges.length}`);
    judges.forEach((j) => console.log(`   • ${j.email}`));
    console.log();

    // 2. Get all "pending" nominations (status = "shortlisted" but not all judges have scored)
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

    // 3. Get all judge_scores
    const scoresByNomination = {};

    allScoresSnap.forEach((doc) => {
      const score = doc.data();
      const nomId = score.nominationId;
      
      if (!scoresByNomination[nomId]) {
        scoresByNomination[nomId] = [];
      }
      
      scoresByNomination[nomId].push({
        judgeUid: score.judgeUid,
        judgeEmail: score.judgeEmail,
        categoryId: score.categoryId,
        criteriaScores: score.criteriaScores || {},
        overallScore: score.overallScore,
      });
    });

    // 4. For each nomination, check which judges have/haven't scored
    console.log('🔍 JUDGING COVERAGE REPORT\n');
    console.log('=' .repeat(80) + '\n');

    const coverageReport = [];
    const first9Noms = nominations.slice(0, 9);
    
    first9Noms.forEach((nom, idx) => {
      const scoresForNom = scoresByNomination[nom.id] || [];
      const judgesWhoScored = scoresForNom.map(s => s.judgeEmail);
      const judgesWhoPending = judges.filter(j => !judgesWhoScored.includes(j.email));

      coverageReport.push({
        index: idx + 1,
        nominationName: nom.name,
        nominationId: nom.id,
        category: nom.category,
        totalJudges: judges.length,
        judgesScored: judgesWhoScored.length,
        judgesPending: judgesWhoPending.length,
        judgesWhoScored,
        judgesWhoPending: judgesWhoPending.map(j => j.email),
      });

      console.log(`${idx + 1}. ${nom.name || 'Unknown Nomination'}`);
      console.log(`   Category: ${nom.category}`);
      console.log(`   Status: ${judgesWhoScored.length}/${judges.length} judges completed`);
      
      if (judgesWhoScored.length > 0) {
        console.log(`   ✅ Scored by:`);
        judgesWhoScored.forEach(email => {
          const score = scoresForNom.find(s => s.judgeEmail === email);
          console.log(`      • ${email} (${score.overallScore ? score.overallScore.toFixed(1) + '/5' : 'partial'})`);
        });
      }
      
      if (judgesWhoPending.length > 0) {
        console.log(`   ⏳ PENDING from:`);
        judgesWhoPending.forEach(j => console.log(`      • ${j.email}`));
      }
      
      console.log();
    });

    // 5. Summary by judge
    console.log('\n' + '=' .repeat(80));
    console.log('\n👨‍⚖️ JUDGE COMPLETION SUMMARY\n');

    const judgeStats = {};
    judges.forEach(j => {
      judgeStats[j.email] = {
        name: j.name,
        completed: 0,
        pending: 0,
        nominations: [],
      };
    });

    coverageReport.forEach((report) => {
      report.judgesWhoScored.forEach(email => {
        if (judgeStats[email]) {
          judgeStats[email].completed++;
        }
      });
      
      report.judgesWhoPending.forEach(email => {
        if (judgeStats[email]) {
          judgeStats[email].pending++;
          judgeStats[email].nominations.push(report.nominationName);
        }
      });
    });

    Object.entries(judgeStats).forEach(([email, stats]) => {
      const total = stats.completed + stats.pending;
      const percentage = total > 0 ? Math.round((stats.completed / total) * 100) : 0;
      console.log(`${email}`);
      console.log(`   Completed: ${stats.completed}/9 (${percentage}%)`);
      
      if (stats.pending > 0) {
        console.log(`   ⏳ Pending: ${stats.pending}`);
        console.log(`   📋 Missing nominations:`);
        stats.nominations.forEach(nom => console.log(`      • ${nom}`));
      } else {
        console.log(`   ✅ All done!`);
      }
      console.log();
    });

    // 6. Export data for email reminders
    const remindersNeeded = [];
    Object.entries(judgeStats).forEach(([email, stats]) => {
      if (stats.pending > 0) {
        remindersNeeded.push({
          judgeEmail: email,
          judgeName: stats.name,
          completedCount: stats.completed,
          pendingCount: stats.pending,
          missingNominationCount: stats.pending,
          nominations: stats.nominations,
          remindUrl: `https://salea2026.netlify.app/judge?remind=${email}`,
        });
      }
    });

    console.log('\n' + '=' .repeat(80));
    console.log('\n📧 REMINDERS NEEDED\n');
    console.log(`Total judges needing reminders: ${remindersNeeded.length}\n`);
    
    if (remindersNeeded.length > 0) {
      remindersNeeded.forEach((reminder, idx) => {
        console.log(`${idx + 1}. ${reminder.judgeEmail}`);
        console.log(`   Completed: ${reminder.completedCount}/9`);
        console.log(`   ⏳ Pending: ${reminder.pendingCount}`);
        console.log(`   Link: ${reminder.remindUrl}\n`);
      });
    }

    // Save to file for reference
    fs.writeFileSync(
      './scripts/judging-coverage-report.json',
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalJudges: judges.length,
        totalPendingNominations: first9Noms.length,
        coverageByNomination: coverageReport,
        judgeStats,
        remindersNeeded,
      }, null, 2)
    );

    console.log('✅ Report saved to scripts/judging-coverage-report.json\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

analyzeJudgingCoverage();
