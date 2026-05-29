/**
 * Netlify Function: office-to-pdf
 *
 * Converts Office documents (DOCX, DOC, XLS, XLSX) to PDF without any
 * external paid API. Uses:
 *   - mammoth  →  DOCX/DOC  → HTML
 *   - xlsx     →  XLS/XLSX  → HTML table
 *   - @sparticuz/chromium + puppeteer-core  →  HTML → PDF
 *
 * Called by the client at POST /api/office-to-pdf
 * (redirected to /.netlify/functions/office-to-pdf via netlify.toml)
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// ─── helpers ─────────────────────────────────────────────────────────────────

const OFFICE_PATTERN = /\.(doc|docx|xls|xlsx)$/i;

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

// ─── document parsers ────────────────────────────────────────────────────────

async function docxToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value || "<p><em>No content extracted from document.</em></p>";
}

function xlsxToHtml(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  if (workbook.SheetNames.length === 0) {
    return "<p><em>No sheets found in workbook.</em></p>";
  }
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const tableHtml = XLSX.utils.sheet_to_html(sheet, { id: sheetName });
    return `<h2 style="margin-top:24px;">${sheetName}</h2>${tableHtml}`;
  }).join('<hr style="margin:24px 0;"/>');
}

// ─── PDF renderer ────────────────────────────────────────────────────────────

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

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullPage, { waitUntil: "domcontentloaded" });
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

// ─── handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return jsonError("Method not allowed.", 405);
  }

  // Parse request body
  let body: { sourceUrl?: string; fileName?: string };
  try {
    body = JSON.parse(event.body ?? "{}") as { sourceUrl?: string; fileName?: string };
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const sourceUrl = body.sourceUrl?.trim();
  const fileName = body.fileName?.trim();

  if (!sourceUrl || !fileName) {
    return jsonError("Both sourceUrl and fileName are required.", 400);
  }

  if (!OFFICE_PATTERN.test(fileName)) {
    const extension = ext(fileName);
    return jsonError(
      `Unsupported format: .${extension}. Supported: .doc, .docx, .xls, .xlsx`,
      400,
    );
  }

  // Download source file from Firebase Storage
  let fileBuffer: Buffer;
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      return jsonError(`Failed to download source file (HTTP ${response.status}).`, 502);
    }
    fileBuffer = Buffer.from(await response.arrayBuffer());
  } catch (err) {
    console.error("[office-to-pdf] Download error:", err);
    return jsonError("Failed to download source file.", 502);
  }

  // Parse document to HTML
  const extension = ext(fileName);
  let bodyHtml: string;
  try {
    if (extension === "docx" || extension === "doc") {
      bodyHtml = await docxToHtml(fileBuffer);
    } else {
      // xls / xlsx
      bodyHtml = xlsxToHtml(fileBuffer);
    }
  } catch (err) {
    console.error("[office-to-pdf] Parse error:", err);
    return jsonError("Failed to parse document. The file may be corrupt or password-protected.", 422);
  }

  // Render HTML to PDF
  let pdfBuffer: Buffer;
  try {
    const title = fileName.replace(/\.[^.]+$/, "");
    pdfBuffer = await htmlToPdf(bodyHtml, title);
  } catch (err) {
    console.error("[office-to-pdf] PDF render error:", err);
    return jsonError("Failed to render PDF from document.", 500);
  }

  const baseName = fileName.replace(/\.[^.]+$/, "");
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
