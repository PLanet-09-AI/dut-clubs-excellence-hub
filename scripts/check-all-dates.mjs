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

async function checkDates() {
  console.log("🔍 Checking all nominations and their createdAt values...\n");

  const nominationsRef = db.collection("nominations");
  const snapshot = await nominationsRef.get();

  const allNoms = [];
  let nullCount = 0;
  let undefinedCount = 0;
  let emptyCount = 0;
  let validCount = 0;

  for (const doc of snapshot.docs) {
    const nom = doc.data();
    const createdAt = nom.createdAt;

    let status = "?";
    if (createdAt === null) {
      status = "null";
      nullCount++;
    } else if (createdAt === undefined) {
      status = "undefined";
      undefinedCount++;
    } else if (createdAt === "") {
      status = "empty string";
      emptyCount++;
    } else {
      status = "valid";
      validCount++;
    }

    allNoms.push({
      id: doc.id,
      nomineeName: nom.nomineeName,
      categoryName: nom.categoryName,
      createdAt: createdAt,
      status: status,
      raw: JSON.stringify(createdAt),
    });
  }

  console.log(`📊 Summary:`);
  console.log(`   Total nominations: ${snapshot.size}`);
  console.log(`   ✓ Valid dates: ${validCount}`);
  console.log(`   ✗ Null: ${nullCount}`);
  console.log(`   ✗ Undefined: ${undefinedCount}`);
  console.log(`   ✗ Empty: ${emptyCount}\n`);

  if (nullCount > 0 || undefinedCount > 0 || emptyCount > 0) {
    console.log("❌ Nominations with missing/invalid dates:\n");
    allNoms
      .filter((n) => n.status !== "valid")
      .forEach((nom) => {
        console.log(`   ${nom.nomineeName} (${nom.categoryName})`);
        console.log(`      Status: ${nom.status}`);
        console.log(`      Raw: ${nom.raw}\n`);
      });
  } else {
    console.log("✅ All nominations have valid createdAt timestamps!");
  }

  console.log("\n📋 All nominations with dates:\n");
  allNoms.forEach((nom) => {
    let displayDate = "—";
    if (nom.createdAt && typeof nom.createdAt === "object" && nom.createdAt.toDate) {
      displayDate = nom.createdAt
        .toDate()
        .toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
    }
    console.log(`   ${nom.nomineeName.padEnd(30)} | ${nom.categoryName.padEnd(40)} | ${displayDate}`);
  });

  process.exit(0);
}

checkDates().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
