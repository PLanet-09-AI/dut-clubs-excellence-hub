import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("./student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json", "utf8")
);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function clearNotifications() {
  try {
    console.log("🗑️  Clearing all judge notifications...\n");
    
    const snapshot = await db.collection('judge_notifications').get();
    let deletedCount = 0;

    for (const doc of snapshot.docs) {
      await doc.ref.delete();
      deletedCount++;
      console.log(`✅ Deleted notifications for: ${doc.id}`);
    }

    console.log(`\n📊 Total deleted: ${deletedCount} notification documents\n`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing notifications:", error);
    process.exit(1);
  }
}

clearNotifications();
