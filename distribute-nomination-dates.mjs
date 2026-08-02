import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json", "utf8")
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function distributeNominationDates() {
  console.log("🔍 Fetching all nominations...\n");

  const snap = await db.collection("nominations").get();
  const nominations = snap.docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));

  console.log(`📊 Found ${nominations.length} nominations\n`);

  // Date range: July 15, 2026 to August 2, 2026
  const startDate = new Date("2026-07-15T08:00:00Z");
  const endDate = new Date("2026-08-02T23:59:59Z");
  const rangeMs = endDate.getTime() - startDate.getTime();

  console.log(
    `📅 Distributing dates across:\n   Start: ${startDate.toDateString()}\n   End: ${endDate.toDateString()}\n`
  );

  // Distribute nominations evenly across the date range
  const batch = db.batch();
  let count = 0;

  nominations.forEach((nom, index) => {
    // Calculate a timestamp distributed throughout the range
    const progress = index / (nominations.length - 1 || 1); // 0 to 1
    const timestampMs = startDate.getTime() + progress * rangeMs;
    const timestamp = Timestamp.fromDate(new Date(timestampMs));

    batch.update(db.collection("nominations").doc(nom.id), {
      createdAt: timestamp,
    });

    const date = new Date(timestampMs);
    console.log(
      `   [${String(index + 1).padStart(2, "0")}/${String(nominations.length).padStart(
        2,
        "0"
      )}] ${nom.data.nomineeName.padEnd(40)} → ${date.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`
    );

    count++;
    if (count === 500) {
      batch.commit();
      count = 0;
    }
  });

  if (count > 0) {
    await batch.commit();
  }

  console.log(
    `\n✅ Distributed ${nominations.length} nominations across July 15 - August 2, 2026`
  );

  // Verify
  console.log("\n🔍 Verifying first 5 and last 5...\n");
  const verify = await db.collection("nominations").get();
  const verified = verify.docs.map((d) => ({
    name: d.data().nomineeName,
    date: d.data().createdAt,
  }));

  [
    ...verified.slice(0, 5),
    verified.length > 10 ? { name: "...", date: null } : null,
    ...verified.slice(-5),
  ]
    .filter((x) => x)
    .forEach((nom) => {
      if (!nom.date) {
        console.log(`   ${nom.name}`);
      } else {
        const date =
          nom.date.toDate?.() || new Date((nom.date._seconds || 0) * 1000);
        console.log(
          `   ${nom.name.padEnd(40)} → ${date.toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}`
        );
      }
    });

  process.exit(0);
}

distributeNominationDates().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
