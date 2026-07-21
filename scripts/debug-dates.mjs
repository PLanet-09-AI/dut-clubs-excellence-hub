import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

async function checkProblematicDates() {
  console.log("🔍 Checking nominations showing '—' in UI...\n");

  const nominationsRef = db.collection("nominations");
  const snapshot = await nominationsRef.get();

  const problematic = [];

  for (const doc of snapshot.docs) {
    const nom = doc.data();
    const createdAt = nom.createdAt;

    // Simulate formatDate logic
    let canParse = false;
    if (createdAt && typeof createdAt === "object" && "toDate" in createdAt && typeof createdAt.toDate === "function") {
      canParse = true;
    } else if (createdAt && typeof createdAt === "object" && "_seconds" in createdAt) {
      canParse = true;
    } else if (createdAt instanceof Date) {
      canParse = true;
    } else if (typeof createdAt === "string") {
      canParse = true;
    } else if (typeof createdAt === "number") {
      canParse = true;
    }

    if (!canParse) {
      problematic.push({
        nomineeName: nom.nomineeName,
        categoryName: nom.categoryName,
        createdAt: createdAt,
        type: typeof createdAt,
        keys: createdAt && typeof createdAt === "object" ? Object.keys(createdAt) : "N/A",
        raw: JSON.stringify(createdAt),
      });
    }
  }

  if (problematic.length === 0) {
    console.log("✅ No formatting issues found. All dates should parse correctly.\n");
    console.log("Checking for values that don't have toDate() method...\n");

    // Check what's actually stored
    for (const doc of snapshot.docs) {
      const nom = doc.data();
      const createdAt = nom.createdAt;

      if (createdAt && !createdAt.toDate) {
        console.log(`❌ ${nom.nomineeName} (${nom.categoryName})`);
        console.log(`   Type: ${typeof createdAt}`);
        console.log(`   Has toDate: ${!!(createdAt && typeof createdAt.toDate === "function")}`);
        console.log(`   Has _seconds: ${!!createdAt._seconds}`);
        console.log(`   Value: ${JSON.stringify(createdAt)}`);
        console.log();
      }
    }
  } else {
    console.log("❌ Found problematic dates:\n");
    problematic.forEach((p) => {
      console.log(`${p.nomineeName} (${p.categoryName})`);
      console.log(`   Type: ${p.type}`);
      console.log(`   Keys: ${p.keys}`);
      console.log(`   Raw: ${p.raw}\n`);
    });
  }

  process.exit(0);
}

checkProblematicDates().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
