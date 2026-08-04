/**
 * Netlify Function: compress-pdf
 *
 * Produces a smaller, lower-quality "preview" copy of a large PDF so it opens
 * reliably even on slow connections/devices, trading visual fidelity for a
 * much smaller download. The ORIGINAL file is never touched — it stays in
 * Storage untouched for full-quality Open/Download.
 *
 * How it works: pdfjs-dist (legacy Node build, already a dependency) renders
 * every page to a raster bitmap via @napi-rs/canvas (a Skia-backed canvas
 * with prebuilt native binaries for Linux x64 — unlike the `canvas` package
 * it needs no Cairo/Pango system libraries, so it works in a Lambda sandbox),
 * encodes each page as a JPEG at a reduced resolution/quality, then
 * reassembles those JPEGs into a brand-new PDF (one full-page image per
 * page) via pdf-lib. This is the classic "rasterize to shrink" technique —
 * it trades the original's vector precision/text layer for a much smaller
 * file, which is the right trade for image-heavy documents (scanned
 * registers, photographed certificates, etc.) that make up most large PDFs.
 *
 * NOTE: an earlier version of this function tried to open the PDF in
 * @sparticuz/chromium's headless Chromium (via puppeteer) and "print" it
 * back to PDF. That doesn't work — @sparticuz/chromium's minimal Lambda
 * build has no PDF viewer plugin, so navigating to a PDF URL just triggers
 * a download and aborts the navigation (net::ERR_ABORTED). Rasterizing with
 * pdfjs-dist directly avoids Chromium entirely for this function.
 *
 * Called by the client at POST /api/compress-pdf
 * (redirected to /.netlify/functions/compress-pdf via netlify.toml)
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
import { createHash } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { PDFDocument as PdfLibDocument } from "pdf-lib";
import { createCanvas, DOMMatrix, Path2D } from "@napi-rs/canvas";

// pdfjs-dist's legacy Node build normally polyfills `DOMMatrix`/`Path2D`
// (and finds a canvas implementation) itself via a dynamic
// `require("@napi-rs/canvas")` built from `import.meta.url`. That breaks
// once this function is bundled by Netlify's esbuild step — `import.meta.url`
// comes back `undefined` in the bundled output, so the internal require
// throws and the polyfills never get applied, crashing with
// "DOMMatrix is not defined" the moment pdf.mjs's module body runs (some of
// its top-level code constructs a `DOMMatrix` immediately on load). Doing
// the polyfilling ourselves via a static import (which bundles fine) avoids
// relying on that fragile dynamic require entirely.
if (!(globalThis as Record<string, unknown>).DOMMatrix) {
  (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrix;
}
if (!(globalThis as Record<string, unknown>).Path2D) {
  (globalThis as Record<string, unknown>).Path2D = Path2D;
}

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

// Source PDFs larger than this are rejected — rasterizing every page of an
// enormous document would blow past the Lambda's time/memory budget.
const MAX_SOURCE_BYTES = 150 * 1024 * 1024; // 150 MB

// Cap the longest side of each rendered page to this many pixels — enough to
// stay legible on screen while keeping per-page JPEGs small.
const MAX_PAGE_PIXELS = 1600;
const JPEG_QUALITY = 0.55;

/** Minimal canvas-and-context pair pdf.js needs for rendering — both the main
 * page canvas and any internal temporary canvases (soft masks/patterns). */
type CanvasAndContext = { canvas: unknown; context: CanvasRenderingContext2D };

/** Canvas factory class backed directly by our statically-imported
 * @napi-rs/canvas — avoids depending on pdfjs-dist's own internal
 * NodeCanvasFactory, which needs a dynamic `require("@napi-rs/canvas")`
 * built from `import.meta.url` to even exist. pdf.js instantiates whatever
 * class is passed as `CanvasFactory` itself (`new CanvasFactory({...})`),
 * so this must be a class, not a plain object. */
class StaticCanvasFactory {
  create(width: number, height: number): CanvasAndContext {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") as unknown as CanvasRenderingContext2D };
  }
  reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
    const canvas = canvasAndContext.canvas as { width: number; height: number };
    canvas.width = width;
    canvas.height = height;
  }
  destroy(canvasAndContext: CanvasAndContext): void {
    const canvas = canvasAndContext.canvas as { width: number; height: number } | null;
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    canvasAndContext.canvas = null;
    canvasAndContext.context = null as unknown as CanvasRenderingContext2D;
  }
}

/** Rasterizes every page of `sourcePdf` to a JPEG and reassembles them into a
 * new, much smaller PDF (one full-page image per page). */
async function compressPdf(sourcePdf: Buffer): Promise<Buffer> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(sourcePdf),
    useSystemFonts: true,
    CanvasFactory: StaticCanvasFactory as unknown as Object,
  });
  const pdfDocument = await loadingTask.promise;
  const canvasFactory = new StaticCanvasFactory();

  const outDoc = await PdfLibDocument.create();

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });

      // Scale down so the longest side is at most MAX_PAGE_PIXELS.
      const longestSide = Math.max(baseViewport.width, baseViewport.height);
      const scale = Math.min(1, MAX_PAGE_PIXELS / longestSide);
      const viewport = page.getViewport({ scale });

      const canvasAndContext = canvasFactory.create(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );

      await page.render({
        canvas: null,
        canvasContext: canvasAndContext.context,
        viewport,
      }).promise;

      const jpegBytes: Buffer = (
        canvasAndContext.canvas as unknown as { toBuffer(mime: "image/jpeg", quality?: number): Buffer }
      ).toBuffer("image/jpeg", JPEG_QUALITY);
      const jpegImage = await outDoc.embedJpg(jpegBytes);

      // Keep the output page the same physical size (in PDF points) as the
      // source page — only the embedded bitmap's resolution is reduced.
      const outPage = outDoc.addPage([baseViewport.width, baseViewport.height]);
      outPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height,
      });

      canvasFactory.destroy(canvasAndContext);
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  const outBytes = await outDoc.save();
  return Buffer.from(outBytes);
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

  // ── Download source PDF ───────────────────────────────────────────────────
  let sourceBuffer: Buffer;
  try {
    console.log("[compress-pdf] Downloading source PDF...");
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      return jsonError(`Failed to download source file (HTTP ${response.status}).`, 502);
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_SOURCE_BYTES) {
      return jsonError("Source file exceeds the 150 MB size limit.", 413);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SOURCE_BYTES) {
      return jsonError("Source file exceeds the 150 MB size limit.", 413);
    }
    sourceBuffer = Buffer.from(arrayBuffer);
    console.log(`[compress-pdf] Downloaded ${sourceBuffer.length} bytes`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(`Failed to download source file: ${msg}`, 502);
  }

  // ── Compress ──────────────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    console.log("[compress-pdf] Rasterizing pages...");
    pdfBuffer = await compressPdf(sourceBuffer);
    console.log(
      `[compress-pdf] Compressed: ${sourceBuffer.length} -> ${pdfBuffer.length} bytes ` +
        `(${Math.round((1 - pdfBuffer.length / sourceBuffer.length) * 100)}% smaller)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error(`[compress-pdf] Compression error: ${msg}`);
    console.error(`[compress-pdf] Stack: ${stack}`);
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
