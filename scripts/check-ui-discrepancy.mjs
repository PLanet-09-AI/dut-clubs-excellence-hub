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

async function checkUIDiscrepancy() {
  console.log('\n🔍 Checking Firestore vs UI Display Discrepancy\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    // Get all judges
    const allScoresSnap = await db.collection('judge_scores').get();
    const judgeEmails = new Set();
    
    allScoresSnap.forEach((doc) => {
      const email = doc.data().judgeEmail;
      if (email) judgeEmails.add(email);
    });
    
    const judges = Array.from(judgeEmails).sort();
    const totalJudges = judges.length;
    
    console.log(`👨‍⚖️ Expected judges: ${totalJudges}`);
    judges.forEach(j => console.log(`   • ${j}`));
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
        name: doc.data().name || '[No Name]',
        category: doc.data().categoryId,
        createdAt: doc.data().createdAt,
      });
    });

    console.log(`📋 Total shortlisted: ${nominations.length}\n`);

    // Build comprehensive score map
    const scoresByNomination = {};
    const judgesByNomination = {};
    
    allScoresSnap.forEach((doc) => {
      const score = doc.data();
      const nomId = score.nominationId;
      const judgeEmail = score.judgeEmail;
      
      if (!scoresByNomination[nomId]) {
        scoresByNomination[nomId] = [];
        judgesByNomination[nomId] = new Set();
      }
      
      scoresByNomination[nomId].push({
        judgeEmail,
        overallScore: score.overallScore,
        hasCompleteScore: score.overallScore !== null && score.overallScore !== undefined,
      });
      
      judgesByNomination[nomId].add(judgeEmail);
    });

    // Find nominations with INCOMPLETE coverage
    const pendingNominations = [];
    
    nominations.forEach((nom) => {
      const judgesWhoScored = Array.from(judgesByNomination[nom.id] || []).sort();
      const judgesWhoPending = judges.filter(j => !judgesWhoScored.includes(j));
      
      if (judgesWhoPending.length > 0) {
        pendingNominations.push({
          ...nom,
          judgesScored: judgesWhoScored.length,
          judgesPending: judgesWhoPending.length,
          judgesWhoScored,
          judgesWhoPending,
          scores: scoresByNomination[nom.id] || [],
        });
      }
    });

    // Report
    console.log('=' .repeat(80));
    console.log(`\n📊 NOMINATIONS WITH INCOMPLETE JUDGING\n`);
    console.log(`Total: ${pendingNominations.length}\n`);

    if (pendingNominations.length > 0) {
      console.log('🔴 These nominations are missing scores from some judges:\n');
      
      pendingNominations.forEach((nom, idx) => {
        console.log(`${idx + 1}. ${nom.name}`);
        console.log(`   ID: ${nom.id}`);
        console.log(`   Category: ${nom.category}`);
        console.log(`   Status: ${nom.judgesScored}/${totalJudges} judges have scored`);
        console.log(`   ✅ Scored by:`);
        nom.judgesWhoScored.forEach(email => {
          const score = nom.scores.find(s => s.judgeEmail === email);
          console.log(`      • ${email}${score.overallScore ? ` (${score.overallScore}/5)` : ' (no overall score)'}`);
        });
        console.log(`   ⏳ MISSING SCORES FROM:`);
        nom.judgesWhoPending.forEach(email => console.log(`      • ${email}`));
        console.log();
      });

      // Summary by judge - who hasn't judged what
      console.log('\n' + '=' .repeat(80));
      console.log('\n👨‍⚖️ WHICH JUDGES ARE MISSING SCORES FOR WHICH NOMINATIONS:\n');
      
      const missingByJudge = {};
      judges.forEach(j => {
        missingByJudge[j] = [];
      });

      pendingNominations.forEach((nom) => {
        nom.judgesWhoPending.forEach(judge => {
          missingByJudge[judge].push(nom.name);
        });
      });

      Object.entries(missingByJudge)
        .filter(([_, noms]) => noms.length > 0)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([judge, noms]) => {
          console.log(`${judge}`);
          console.log(`   Missing: ${noms.length} nominations`);
          noms.forEach((nom, idx) => {
            if (idx < 5) console.log(`      ${idx + 1}. ${nom}`);
          });
          if (noms.length > 5) console.log(`      ... and ${noms.length - 5} more`);
          console.log();
        });
    } else {
      console.log('✅ NO NOMINATIONS WITH INCOMPLETE JUDGING FOUND\n');
      console.log('But UI shows "Pending Judging: 9"');
      console.log('This suggests the UI calculates "pending" differently.\n');
      console.log('Possible reasons:');
      console.log('1. UI might use a different field (e.g., "judgingStatus" vs "status")');
      console.log('2. UI might count nominations waiting for results publication');
      console.log('3. There might be a filter or cache issue\n');
    }

    // Save detailed report
    fs.writeFileSync(
      './scripts/incomplete-judging-detailed.json',
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalJudges,
        judges,
        totalShortlisted: nominations.length,
        incompleteCount: pendingNominations.length,
        pendingNominations,
      }, null, 2)
    );

    console.log('✅ Detailed report saved to scripts/incomplete-judging-detailed.json\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkUIDiscrepancy();
