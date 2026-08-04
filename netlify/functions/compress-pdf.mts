/**
 * Netlify Function: compress-pdf
 *
 * Produces a smaller, lower-quality "preview" copy of a large PDF so it opens
 * reliably even on slow connections/devices, trading some visual fidelity for
 * a much smaller download. The ORIGINAL file is never touched — it stays in
 * Storage untouched for full-quality Open/Download.
 *
 * How it works: headless Chromium (already used by office-to-pdf.mts) opens
 * the source PDF directly in its built-in PDF viewer, then "prints" it back
 * to PDF via `page.pdf()`. Chromium's print pipeline re-rasterizes/recompresses
 * embedded images, which is where the size reduction comes from — this is the
 * same technique as using a desktop browser's "Print → Save as PDF" on an
 * open PDF to shrink it. No paid API, no extra native dependencies.
 *
 * Called by the client at POST /api/compress-pdf
 * (redirected to /.netlify/functions/compress-pdf via netlify.toml)
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
import { createHash } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET || "student-services-745d5.appspot.com";
const CACHE_PREFIX = "pdf-compressed-cache/";
const SIGNED_URL_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 6 days (GCS signed URL max is 7 days)

function getBucket() {
  if (getApps().length === 0) {
    const credB64 = process.env.FIREBASE_ADMIN_SDK_B64 || "";
    if (!credB64) {
      throw new Error("FIREBASE_ADMIN_SDK_B64 environment variable is not set");
    }
    const serviceAccount = JSON.parse(Buffer.from(credB64, "base64").toString());
    initializeApp({ credential: cert(serviceAccount), storageBucket: STORAGE_BUCKET });
  }
  return getStorage().bucket(STORAGE_BUCKET);
}

function cacheKeyFor(sourceUrl: string): string {
  return `${CACHE_PREFIX}${createHash("sha256").update(sourceUrl).digest("hex")}.pdf`;
}

async function signedUrlFor(objectPath: string): Promise<string> {
  const bucket = getBucket();
  const [url] = await bucket.file(objectPath).getSignedUrl({
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return url;
}

function jsonError(message: string, status: number) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}

// Same extra flags office-to-pdf.mts uses to keep Chromium lean in a Lambda sandbox.
const EXTRA_CHROMIUM_ARGS = [
  "--no-sandbox",
  "--no-zygote",
  "--single-process",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-sync",
  "--disable-translate",
  "--hide-scrollbars",
  "--metrics-recording-only",
  "--mute-audio",
  "--safebrowsing-disable-auto-update",
];

async function compressPdf(sourceUrl: string): Promise<Buffer> {
  const [chromiumModule, puppeteerModule] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);
  const chromium = chromiumModule.default;
  const puppeteer = puppeteerModule.default;

  let executablePath: string | undefined;
  try {
    const pathPromise = chromium.executablePath();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("executablePath() timed out after 20 s")), 20_000),
    );
    executablePath = await Promise.race([pathPromise, timeoutPromise]);
  } catch (err) {
    console.warn("[compress-pdf] executablePath() failed — will attempt without explicit path:", err);
  }

  const baseArgs: string[] = Array.isArray(chromium.args) ? chromium.args : [];
  const mergedArgs = Array.from(new Set([...baseArgs, ...EXTRA_CHROMIUM_ARGS]));

  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    args: mergedArgs,
    defaultViewport: { width: 1000, height: 1400 },
    headless: true,
    protocolTimeout: 50_000,
  };
  if (executablePath) launchOptions.executablePath = executablePath;

  console.log("[compress-pdf] Launching browser...");
  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();

    console.log("[compress-pdf] Opening source PDF in Chromium's built-in viewer...");
    await page.goto(sourceUrl, { waitUntil: "networkidle0", timeout: 45_000 });

    console.log("[compress-pdf] Printing to PDF (this re-rasterizes/recompresses embedded images)...");
    const pdfBytes = await page.pdf({
      printBackground: true,
      timeout: 45_000,
    });

    console.log(`[compress-pdf] Compressed PDF rendered: ${pdfBytes.length} bytes`);
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

export const handler: Handler = async (event: HandlerEvent) => {
  console.log(`[compress-pdf] Incoming ${event.httpMethod} request`);

  if (event.httpMethod !== "POST") {
    return jsonError("Method not allowed.", 405);
  }

  // ── Security: validate Origin to prevent CSRF (OWASP A05) ───────────────
  const origin = event.headers["origin"] ?? "";
  const host = event.headers["host"] ?? "";
  const ALLOWED_ORIGINS = [
    `https://${host}`,
    "https://salea2026.netlify.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ];
  if (origin && !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    console.warn(`[compress-pdf] Blocked cross-origin request from: ${origin}`);
    return jsonError("Forbidden.", 403);
  }

  // ── Security: payload size guard ─────────────────────────────────────────
  const bodyStr = event.body ?? "";
  const MAX_BODY_BYTES = 10 * 1024;
  if (Buffer.byteLength(bodyStr, "utf8") > MAX_BODY_BYTES) {
    return jsonError("Request body too large.", 413);
  }

  let body: { sourceUrl?: string };
  try {
    body = JSON.parse(bodyStr) as { sourceUrl?: string };
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const sourceUrl = body.sourceUrl?.trim();
  if (!sourceUrl) {
    return jsonError("sourceUrl is required.", 400);
  }

  // ── Security: validate sourceUrl is a Firebase Storage URL (SSRF guard) ──
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return jsonError("Invalid sourceUrl.", 400);
  }
  const ALLOWED_STORAGE_HOSTS = ["firebasestorage.googleapis.com", "storage.googleapis.com"];
  if (!ALLOWED_STORAGE_HOSTS.includes(parsedUrl.hostname)) {
    console.warn(`[compress-pdf] Blocked SSRF attempt — host: ${parsedUrl.hostname}`);
    return jsonError("sourceUrl must point to Firebase Storage.", 400);
  }

  // ── Cache check: reuse a previously-compressed PDF when available ───────
  const cacheKey = cacheKeyFor(sourceUrl);
  try {
    const [cachedExists] = await getBucket().file(cacheKey).exists();
    if (cachedExists) {
      console.log(`[compress-pdf] Cache hit (${cacheKey})`);
      const pdfUrl = await signedUrlFor(cacheKey);
      return {
        statusCode: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
        body: JSON.stringify({ pdfUrl, cached: true }),
      };
    }
  } catch (err) {
    console.warn("[compress-pdf] Cache lookup failed, proceeding with compression:", err);
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await compressPdf(sourceUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[compress-pdf] Compression error: ${msg}`);
    return jsonError(`Failed to compress PDF: ${msg}`, 500);
  }

  console.log(`[compress-pdf] Uploading ${pdfBuffer.length} bytes to Storage cache`);
  try {
    await getBucket().file(cacheKey).save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    const pdfUrl = await signedUrlFor(cacheKey);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ pdfUrl, cached: false }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[compress-pdf] Upload error: ${msg}`);
    return jsonError(`Failed to store compressed PDF: ${msg}`, 500);
  }
};
