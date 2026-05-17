/**
 * set-storage-cors.mjs
 * Applies CORS rules to the Firebase Storage bucket without gsutil/gcloud.
 *
 * Usage:  node scripts/set-storage-cors.mjs
 *
 * Requires: firebase CLI authenticated (`firebase login`) — uses its stored
 * OAuth token to call the Cloud Storage JSON API directly.
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const BUCKET  = "student-services-745d5.firebasestorage.app";
const PROJECT = "student-services-745d5";

const CORS = [
  {
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:8083",
      "http://localhost:5173",
      "https://*.pages.dev",
      "https://*.workers.dev",
    ],
    method: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    responseHeader: [
      "Content-Type",
      "Content-Length",
      "Content-Range",
      "Range",
      "Authorization",
      "X-Firebase-Storage-Version",
      "X-Goog-Upload-Command",
      "X-Goog-Upload-Header-Content-Length",
      "X-Goog-Upload-Header-Content-Type",
      "X-Goog-Upload-Protocol",
      "X-Goog-Upload-Status",
      "X-Goog-Upload-URL",
    ],
    maxAgeSeconds: 3600,
  },
];

// ── Get OAuth token from firebase-tools credential store ──────────────────
console.log("Fetching Firebase OAuth token from credential store…");

function readStoredToken() {
  // firebase-tools stores creds in configstore
  const paths = [
    join(homedir(), ".config", "configstore", "firebase-tools.json"),              // Windows (actual) / Linux/macOS
    join(homedir(), "AppData", "Roaming", "configstore", "firebase-tools.json"), // Windows (legacy)
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      const cfg = JSON.parse(readFileSync(p, "utf8"));
      // v15.x stores tokens directly under cfg.tokens.access_token
      const at = cfg?.tokens?.access_token;
      if (at) return at;
    } catch { /* ignore parse errors */ }
  }
  return null;
}

function refreshToken() {
  // Use gcloud application-default or firebase-tools to refresh
  try {
    return execSync("firebase auth:export --format=json 2>NUL", { encoding: "utf8", stdio: ["pipe","pipe","pipe"] });
  } catch { return null; }
}

let token = readStoredToken();

if (!token) {
  console.log("No stored token found — attempting `firebase login` (browser will open)…");
  try {
    execSync("firebase login --no-localhost", { stdio: "inherit" });
    token = readStoredToken();
  } catch { /* ignore */ }
}

if (!token) {
  console.error(
    "\n❌  Could not retrieve a Firebase OAuth token.\n\n" +
    "  Option A — Run in this terminal:\n" +
    "    firebase login\n" +
    "  then: node scripts/set-storage-cors.mjs\n\n" +
    "  Option B — Use Google Cloud Shell (no install needed):\n" +
    "    1. Open https://console.cloud.google.com/storage/browser?project=student-services-745d5\n" +
    "    2. Click the Cloud Shell icon (top-right toolbar)\n" +
    '    3. Run: echo \'' + JSON.stringify([{origin:["https://*.pages.dev","http://localhost:8080","http://localhost:8081","http://localhost:8082","http://localhost:8083"],method:["GET","POST","PUT","DELETE","OPTIONS","HEAD"],responseHeader:["Content-Type","Content-Length","Authorization","X-Firebase-Storage-Version","X-Goog-Upload-Command","X-Goog-Upload-Header-Content-Length","X-Goog-Upload-Header-Content-Type","X-Goog-Upload-Protocol","X-Goog-Upload-Status","X-Goog-Upload-URL"],maxAgeSeconds:3600}]) + '\' > /tmp/cors.json\n' +
    "    4. gsutil cors set /tmp/cors.json gs://student-services-745d5.firebasestorage.app\n"
  );
  process.exit(1);
}

// ── Patch the bucket's CORS via Cloud Storage JSON API ────────────────────
const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}?project=${PROJECT}`;

console.log(`Applying CORS to  gs://${BUCKET}  …`);
const res = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ cors: CORS }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`\n❌  API error ${res.status}:\n${body}\n`);
  process.exit(1);
}

const data = await res.json();
console.log("\n✅  CORS applied successfully!");
console.log("Current CORS rules:", JSON.stringify(data.cors ?? [], null, 2));
