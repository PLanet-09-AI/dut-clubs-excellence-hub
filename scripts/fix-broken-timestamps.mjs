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

const fixDate = Timestamp.fromDate(new Date("2026-07-15"));

async function fixServerTimestampSentinels() {
  console.log("🔍 Finding nominations with serverTimestamp() sentinels...\n");

  const nominationsRef = db.collection("nominations");
  const snapshot = await nominationsRef.get();

  const needsFixing = [];

  for (const doc of snapshot.docs) {
    const nom = doc.data();
    const createdAt = nom.createdAt;

    if (createdAt && typeof createdAt === "object" && createdAt._methodName === "serverTimestamp") {
      needsFixing.push({
        id: doc.id,
        nomineeName: nom.nomineeName,
        categoryName: nom.categoryName,
      });
    }
  }

  console.log(`📊 Found ${needsFixing.length} nominations with broken serverTimestamp() sentinels:\n`);

  if (needsFixing.length === 0) {
    console.log("✅ No sentinels found. All timestamps are properly stored.");
    process.exit(0);
  }

  needsFixing.forEach((nom) => {
    console.log(`   • ${nom.nomineeName} (${nom.categoryName})`);
  });

  console.log(`\n🔄 Fixing ${needsFixing.length} documents with proper Timestamp...\n`);

  for (const nom of needsFixing) {
    await nominationsRef.doc(nom.id).update({ createdAt: fixDate });
    console.log(`   ✓ ${nom.nomineeName}`);
  }

  console.log(`\n✅ Successfully fixed all ${needsFixing.length} nominations!`);
  console.log(`   All now have createdAt = 15 Jul 2026`);

  process.exit(0);
}

fixServerTimestampSentinels().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
