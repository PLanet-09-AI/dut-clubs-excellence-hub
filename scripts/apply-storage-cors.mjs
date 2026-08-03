// One-off script: applies cors.json to the Firebase Storage bucket using the
// service account credentials already committed to the repo, since gsutil/
// gcloud CLI aren't installed locally. Run with: node scripts/apply-storage-cors.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const serviceAccount = JSON.parse(
  readFileSync(
    path.join(repoRoot, "student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json"),
    "utf8",
  ),
);

const corsConfig = JSON.parse(readFileSync(path.join(repoRoot, "cors.json"), "utf8"));

const BUCKET_NAME = "student-services-745d5.firebasestorage.app";

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: BUCKET_NAME,
});

const bucket = getStorage().bucket();
await bucket.setMetadata({ cors: corsConfig });

const [metadata] = await bucket.getMetadata();
console.log("Applied CORS config. Bucket now reports:");
console.log(JSON.stringify(metadata.cors, null, 2));
