import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  fs.readFileSync(
    path.resolve("student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json"),
    "utf8"
  )
);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

const backfillDate = Timestamp.fromDate(new Date("2026-07-15"));

async function backfillMissingDates() {
  console.log("🔍 Searching for nominations with missing createdAt...");

  const nominationsRef = db.collection("nominations");
  const snapshot = await nominationsRef.get();

  const missingDates = [];
  const existingDates = [];

  for (const doc of snapshot.docs) {
    const nom = doc.data();
    if (!nom.createdAt) {
      missingDates.push({ id: doc.id, ...nom });
    } else {
      existingDates.push({ id: doc.id, ...nom });
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✓ ${existingDates.length} nominations with dates`);
  console.log(`   ✗ ${missingDates.length} nominations missing createdAt\n`);

  if (missingDates.length === 0) {
    console.log("✅ All nominations have createdAt. Nothing to update.");
    process.exit(0);
  }

  console.log("📝 Nominations missing dates:");
  missingDates.forEach((nom) => {
    console.log(
      `   • ${nom.nomineeName} (${nom.categoryName}) - Student #${nom.nomineeEmail}`
    );
  });

  console.log(`\n🔄 Updating ${missingDates.length} documents with 15 Jul 2026...`);

  const batch = db.batch();
  let count = 0;

  for (const nom of missingDates) {
    batch.update(nominationsRef.doc(nom.id), { createdAt: backfillDate });
    count++;

    // Firestore batch has 500 doc limit, so commit in batches
    if (count === 500) {
      await batch.commit();
      console.log(`   ✓ Committed batch of ${count} updates`);
      count = 0;
    }
  }

  // Commit remaining
  if (count > 0) {
    await batch.commit();
    console.log(`   ✓ Committed final batch of ${count} updates`);
  }

  console.log(
    `\n✅ Successfully backfilled ${missingDates.length} nominations with createdAt = 15 Jul 2026`
  );

  // Verify updates
  console.log("\n🔍 Verifying updates...");
  const verifySnapshot = await nominationsRef.get();
  const stillMissing = [];

  for (const doc of verifySnapshot.docs) {
    if (!doc.data().createdAt) {
      stillMissing.push(doc.id);
    }
  }

  if (stillMissing.length === 0) {
    console.log("✅ All nominations now have createdAt timestamps!");
  } else {
    console.log(
      `⚠️  ${stillMissing.length} documents still missing createdAt: ${stillMissing.join(", ")}`
    );
  }

  process.exit(0);
}

backfillMissingDates().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
