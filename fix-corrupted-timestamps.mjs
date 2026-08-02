import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json", "utf8")
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function fixCorruptedTimestamps() {
  console.log("🔍 Searching for nominations with corrupted serverTimestamp...\n");

  const snap = await db.collection("nominations").get();
  
  const corrupted = [];
  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (
      data.createdAt &&
      typeof data.createdAt === "object" &&
      data.createdAt._methodName === "serverTimestamp"
    ) {
      corrupted.push({
        id: doc.id,
        nomineeName: data.nomineeName,
        categoryName: data.categoryName,
      });
    }
  });

  console.log(`📊 Found ${corrupted.length} nominations with corrupted serverTimestamp\n`);

  if (corrupted.length === 0) {
    console.log("✅ No corrupted timestamps found!");
    process.exit(0);
  }

  console.log("📝 Corrupted nominations:");
  corrupted.forEach((nom) => {
    console.log(`   • ${nom.nomineeName} (${nom.categoryName})`);
  });

  console.log(`\n🔄 Fixing ${corrupted.length} documents with server timestamp...\n`);

  const batch = db.batch();
  let count = 0;

  for (const nom of corrupted) {
    batch.update(db.collection("nominations").doc(nom.id), {
      createdAt: FieldValue.serverTimestamp(),
    });
    count++;

    if (count === 500) {
      await batch.commit();
      console.log(`   ✓ Committed batch of ${count} updates`);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`   ✓ Committed final batch of ${count} updates`);
  }

  console.log(
    `\n✅ Successfully fixed ${corrupted.length} nominations with server timestamp`
  );

  // Verify updates
  console.log("\n🔍 Verifying fixes...\n");
  const verifySnap = await db.collection("nominations").limit(5).get();
  
  verifySnap.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`[Nom ${i+1}] ${data.nomineeName}`);
    if (data.createdAt && data.createdAt.toDate) {
      console.log(
        `  ✓ Fixed - ${data.createdAt.toDate().toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      );
    } else {
      console.log(`  ✗ Still broken: ${JSON.stringify(data.createdAt)}`);
    }
  });

  process.exit(0);
}

fixCorruptedTimestamps().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
