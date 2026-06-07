/**
 * Netlify Function: office-to-pdf
 *
 * Converts Office documents (DOCX, DOC, XLS, XLSX, PPTX, PPSX) to PDF without any
 * external paid API. Uses:
 *   - mammoth  →  DOCX/DOC  → HTML
 *   - xlsx     →  XLS/XLSX  → HTML table
 *   - jszip + fast-xml-parser  →  PPTX/PPSX → extracted text HTML
 *   - @sparticuz/chromium + puppeteer-core  →  HTML → PDF
 *
 * Called by the client at POST /api/office-to-pdf
 * (redirected to /.netlify/functions/office-to-pdf via netlify.toml)
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

// ─── helpers ─────────────────────────────────────────────────────────────────

const OFFICE_PATTERN = /\.(doc|docx|xls|xlsx|pptx|ppsx)$/i;

function ext(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function jsonError(message: string, status: number) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── document parsers ────────────────────────────────────────────────────────

async function docxToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value || "<p><em>No content extracted from document.</em></p>";
}

function xlsxToHtml(buffer: Buffer): string {
  // Hard-limit the workbook to prevent ReDoS / prototype-pollution abuse
  // (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9 in the xlsx package).
  // We never process formula evaluation (cellFormula: false) and disable
  // dangerous features; only raw cell values are needed for display.
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellFormula: false,   // disable formula evaluation → prevents ReDoS
    cellHTML: false,       // no raw HTML in cells
    cellStyles: false,     // ignore styling
    sheetRows: 500,        // never read more than 500 rows per sheet
  });
  const MAX_SHEETS = 10;
  if (workbook.SheetNames.length === 0) {
    return "<p><em>No sheets found in workbook.</em></p>";
  }
  return workbook.SheetNames.slice(0, MAX_SHEETS).map((sheetName: string) => {
    // Sanitize the sheet name before embedding in HTML
    const safeSheetName = sheetName.replace(/[<>&"']/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
    );
    const sheet = workbook.Sheets[sheetName];
    const tableHtml = XLSX.utils.sheet_to_html(sheet, { id: undefined });
    return `<h2 style="margin-top:24px;">${safeSheetName}</h2>${tableHtml}`;
  }).join('<hr style="margin:24px 0;"/>');
}

async function pptxToHtml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: false,
    parseTagValue: false,
  });

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const ai = Number((a.match(/slide(\d+)\.xml/i) ?? ["", "0"])[1]);
      const bi = Number((b.match(/slide(\d+)\.xml/i) ?? ["", "0"])[1]);
      return ai - bi;
    });

  if (slideFiles.length === 0) {
    return "<p><em>No slides found in presentation.</em></p>";
  }

  const slidesHtml: string[] = [];

  for (let i = 0; i < slideFiles.length; i += 1) {
    const fileName = slideFiles[i];
    const xml = await zip.file(fileName)?.async("text");
    if (!xml) continue;

    const root = parser.parse(xml) as {
      "p:sld"?: {
        "p:cSld"?: {
          "p:spTree"?: {
            "p:sp"?: unknown;
          };
        };
      };
    };

    const shapes = toArray(root["p:sld"]?.["p:cSld"]?.["p:spTree"]?.["p:sp"] as unknown);
    const lines: string[] = [];

    for (const shape of shapes) {
      const s = shape as {
        "p:txBody"?: {
          "a:p"?: unknown;
        };
      };
      const paragraphs = toArray(s["p:txBody"]?.["a:p"] as unknown);
      for (const paragraph of paragraphs) {
        const p = paragraph as {
          "a:r"?: unknown;
          "a:t"?: string;
        };
        const runs = toArray(p["a:r"] as unknown);
        const parts: string[] = [];

        for (const run of runs) {
          const r = run as { "a:t"?: string };
          if (typeof r["a:t"] === "string" && r["a:t"].length > 0) {
            parts.push(r["a:t"]);
          }
        }

        if (typeof p["a:t"] === "string" && p["a:t"].length > 0) {
          parts.push(p["a:t"]);
        }

        const text = parts.join("").trim();
        if (text.length > 0) {
          lines.push(text);
        }
      }
    }

    const contentHtml = lines.length
      ? lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
      : "<p><em>(Slide has no extracted text)</em></p>";

    slidesHtml.push(
      `<section style="page-break-after: always;"><h2>Slide ${i + 1}</h2>${contentHtml}</section>`,
    );
  }

  return slidesHtml.join("\n");
}

// ─── PDF renderer ────────────────────────────────────────────────────────────

// Extra Chromium flags that reduce cold-start time and memory pressure in
// serverless environments (no GPU, no sandbox, single-process renderer).
const EXTRA_CHROMIUM_ARGS = [
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-setuid-sandbox",
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

async function htmlToPdf(bodyHtml: string, documentTitle: string): Promise<Buffer> {
  const fullPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${documentTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111;
      margin: 0;
      padding: 0;
    }
    h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.4em; color: #1a1a1a; }
    p { margin: 0.4em 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.6em 0;
      font-size: 9pt;
    }
    td, th {
      border: 1px solid #bbb;
      padding: 4px 8px;
      vertical-align: top;
    }
    th { background-color: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) td { background-color: #f9f9f9; }
    img { max-width: 100%; height: auto; }
    a { color: #1a56db; }
    ul, ol { margin: 0.4em 0; padding-left: 1.5em; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;

  // Dynamically import both modules (ESM, not bundled)
  const [chromiumModule, puppeteerModule] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);
  const chromium = chromiumModule.default;
  const puppeteer = puppeteerModule.default;

  // executablePath() decompresses the bundled Chromium binary on first call —
  // give it a generous timeout so a cold start doesn't abort early.
  console.log("[htmlToPdf] Resolving Chromium executable path...");
  let executablePath: string | undefined;
  try {
    const pathPromise = chromium.executablePath();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("executablePath() timed out after 20 s")), 20_000),
    );
    executablePath = await Promise.race([pathPromise, timeoutPromise]);
  } catch (err) {
    console.warn("[htmlToPdf] executablePath() failed — will attempt without explicit path:", err);
  }
  console.log(`[htmlToPdf] Executable path: ${executablePath ?? "(system default)"}`);

  // Merge @sparticuz/chromium's recommended args with our extra performance flags,
  // deduplicating so we don't pass the same flag twice.
  const baseArgs: string[] = Array.isArray(chromium.args) ? chromium.args : [];
  const mergedArgs = Array.from(new Set([...baseArgs, ...EXTRA_CHROMIUM_ARGS]));

  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    args: mergedArgs,
    defaultViewport: { width: 1280, height: 900 },
    headless: true,
    // protocolTimeout guards against a page that never responds
    protocolTimeout: 30_000,
  };
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  console.log("[htmlToPdf] Launching browser...");
  const browser = await puppeteer.launch(launchOptions);
  console.log("[htmlToPdf] Browser launched");

  try {
    const page = await browser.newPage();

    // Abort image/font/media requests — we only need the HTML we generated
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "font", "media", "stylesheet"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setContent(fullPage, { waitUntil: "domcontentloaded", timeout: 15_000 });

    console.log("[htmlToPdf] Rendering PDF...");
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      timeout: 20_000,
    });

    console.log(`[htmlToPdf] PDF rendered: ${pdfBytes.length} bytes`);
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
    console.log("[htmlToPdf] Browser closed");
  }
}

// ─── handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async (event: HandlerEvent) => {
  console.log(`[office-to-pdf] Incoming ${event.httpMethod} request`);

  if (event.httpMethod !== "POST") {
    return jsonError("Method not allowed.", 405);
  }

  // ── Security: validate Origin to prevent CSRF (OWASP A05) ───────────────
  const origin = event.headers["origin"] ?? "";
  const host = event.headers["host"] ?? "";
  const ALLOWED_ORIGINS = [
    `https://${host}`,
    "https://salea2026.netlify.app",
    // allow local dev
    "http://localhost:3000",
    "http://localhost:5173",
  ];
  // Only block if an Origin header is present (same-origin requests from the browser
  // won't send Origin for GET but do for POST — malicious cross-site POSTs will).
  if (origin && !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    console.warn(`[office-to-pdf] Blocked cross-origin request from: ${origin}`);
    return jsonError("Forbidden.", 403);
  }

  // ── Security: payload size guard (prevent DoS via huge body) ────────────
  const bodyStr = event.body ?? "";
  const MAX_BODY_BYTES = 10 * 1024; // JSON body is just URLs — 10 KB is generous
  if (Buffer.byteLength(bodyStr, "utf8") > MAX_BODY_BYTES) {
    return jsonError("Request body too large.", 413);
  }

  // Parse request body
  let body: { sourceUrl?: string; fileName?: string };
  try {
    body = JSON.parse(bodyStr) as { sourceUrl?: string; fileName?: string };
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const sourceUrl = body.sourceUrl?.trim();
  const fileName = body.fileName?.trim();

  if (!sourceUrl || !fileName) {
    return jsonError("Both sourceUrl and fileName are required.", 400);
  }

  // ── Security: validate sourceUrl is a Firebase Storage URL (SSRF guard) ──
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return jsonError("Invalid sourceUrl.", 400);
  }
  const ALLOWED_STORAGE_HOSTS = [
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
  ];
  if (!ALLOWED_STORAGE_HOSTS.includes(parsedUrl.hostname)) {
    console.warn(`[office-to-pdf] Blocked SSRF attempt — host: ${parsedUrl.hostname}`);
    return jsonError("sourceUrl must point to Firebase Storage.", 400);
  }

  // ── Security: validate fileName extension ────────────────────────────────
  if (!OFFICE_PATTERN.test(fileName)) {
    const extension = ext(fileName);
    return jsonError(
      `Unsupported format: .${extension}. Supported: .doc, .docx, .xls, .xlsx, .pptx, .ppsx`,
      400,
    );
  }

  // ── Security: prevent path traversal in fileName ─────────────────────────
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return jsonError("Invalid fileName.", 400);
  }

  // Download source file from Firebase Storage
  let fileBuffer: Buffer;
  try {
    console.log(`[office-to-pdf] Downloading file: ${fileName}`);
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      const msg = `Failed to download source file (HTTP ${response.status}).`;
      console.error(`[office-to-pdf] ${msg}`);
      return jsonError(msg, 502);
    }

    // ── Security: cap download size at 50 MB ──────────────────────────────
    const MAX_FILE_BYTES = 50 * 1024 * 1024;
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_FILE_BYTES) {
      return jsonError("Source file exceeds the 50 MB size limit.", 413);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
      return jsonError("Source file exceeds the 50 MB size limit.", 413);
    }

    fileBuffer = Buffer.from(arrayBuffer);
    console.log(`[office-to-pdf] Downloaded ${fileBuffer.length} bytes`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[office-to-pdf] Download error: ${msg}`);
    return jsonError(`Failed to download source file: ${msg}`, 502);
  }

  // Parse document to HTML
  const extension = ext(fileName);
  let bodyHtml: string;
  try {
    console.log(`[office-to-pdf] Parsing .${extension} file`);
    if (extension === "docx" || extension === "doc") {
      bodyHtml = await docxToHtml(fileBuffer);
    } else if (extension === "pptx" || extension === "ppsx") {
      bodyHtml = await pptxToHtml(fileBuffer);
    } else {
      // xls / xlsx
      bodyHtml = xlsxToHtml(fileBuffer);
    }
    console.log(`[office-to-pdf] Parsed HTML: ${bodyHtml.length} characters`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[office-to-pdf] Parse error (.${extension}): ${msg}`);
    return jsonError(`Failed to parse document. The file may be corrupt or password-protected: ${msg}`, 422);
  }

  // Render HTML to PDF
  let pdfBuffer: Buffer;
  try {
    const title = fileName.replace(/\.[^.]+$/, "");
    console.log(`[office-to-pdf] Starting PDF render (title: ${title})`);
    console.log(`[office-to-pdf] Memory before render: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
    
    pdfBuffer = await htmlToPdf(bodyHtml, title);
    
    console.log(`[office-to-pdf] PDF rendered: ${pdfBuffer.length} bytes`);
    console.log(`[office-to-pdf] Memory after render: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error(`[office-to-pdf] PDF render error: ${msg}`);
    console.error(`[office-to-pdf] Stack: ${stack}`);
    console.error(`[office-to-pdf] Memory at error: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
    return jsonError(`Failed to render PDF: ${msg}`, 500);
  }

  const baseName = fileName.replace(/\.[^.]+$/, "");
  console.log(`[office-to-pdf] Success: returning ${pdfBuffer.length} bytes as PDF`);
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/pdf",
      "cache-control": "no-store",
      "content-disposition": `inline; filename="${baseName}.pdf"`,
    },
    body: pdfBuffer.toString("base64"),
    isBase64Encoded: true,
  };
};
