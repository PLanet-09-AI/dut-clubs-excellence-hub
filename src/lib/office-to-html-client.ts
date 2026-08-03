/**
 * office-to-html-client — converts Office documents (DOCX, XLS, XLSX, PPTX,
 * PPSX) to previewable HTML entirely in the browser.
 *
 * Why this exists: the server-side pipeline (netlify/functions/office-to-pdf.mts)
 * downloads the file, renders it with headless Chromium, and has hard ceilings
 * baked in — a 50 MB download cap, ~15-20s Chromium timeouts, and a fixed
 * function memory budget. Large documents (long reports, big spreadsheets,
 * image-heavy slide decks) can time out or get truncated server-side.
 *
 * Converting in the browser instead removes all of those server limits — the
 * conversion scales with the viewer's own device instead of a shared,
 * time/memory-capped serverless function. This module intentionally mirrors
 * the parsing logic in office-to-pdf.mts (mammoth for docx, SheetJS for
 * xls/xlsx, jszip + fast-xml-parser for pptx/ppsx) so the two pipelines stay
 * in sync, but skips the PDF-rendering step — the result is just styled HTML
 * dropped into an `<iframe srcDoc>`.
 *
 * Legacy binary `.doc` files aren't supported here (mammoth only reads the
 * OOXML `.docx` format) — callers should fall back to the server pipeline for
 * those.
 */

import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

/** Extensions this client-side converter can handle (excludes legacy .doc). */
export const CLIENT_CONVERTIBLE_PATTERN = /\.(docx|xls|xlsx|pptx|ppsx)$/i;

function ext(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

async function docxToHtml(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return result.value || "<p><em>No content extracted from document.</em></p>";
}

function xlsxToHtml(buffer: ArrayBuffer): string {
  // Same hardening as the server pipeline: never evaluate formulas, no raw
  // cell HTML, and a sane row/sheet ceiling so a malicious workbook can't
  // freeze the tab (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9 in the xlsx package).
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    sheetRows: 2000, // browsers can comfortably render more rows than the Lambda could
  });
  const MAX_SHEETS = 25;
  if (workbook.SheetNames.length === 0) {
    return "<p><em>No sheets found in workbook.</em></p>";
  }
  return workbook.SheetNames.slice(0, MAX_SHEETS)
    .map((sheetName: string) => {
      const safeSheetName = sheetName.replace(
        /[<>&"']/g,
        (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
      );
      const sheet = workbook.Sheets[sheetName];
      const tableHtml = XLSX.utils.sheet_to_html(sheet, { id: undefined });
      return `<h2 style="margin-top:24px;">${safeSheetName}</h2>${tableHtml}`;
    })
    .join('<hr style="margin:24px 0;"/>');
}

async function pptxToHtml(buffer: ArrayBuffer): Promise<string> {
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
      "p:sld"?: { "p:cSld"?: { "p:spTree"?: { "p:sp"?: unknown } } };
    };

    const shapes = toArray(root["p:sld"]?.["p:cSld"]?.["p:spTree"]?.["p:sp"] as unknown);
    const lines: string[] = [];

    for (const shape of shapes) {
      const s = shape as { "p:txBody"?: { "a:p"?: unknown } };
      const paragraphs = toArray(s["p:txBody"]?.["a:p"] as unknown);
      for (const paragraph of paragraphs) {
        const p = paragraph as { "a:r"?: unknown; "a:t"?: string };
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

const PAGE_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #111;
    margin: 0;
    padding: 16px 20px;
  }
  h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.4em; color: #1a1a1a; }
  p { margin: 0.4em 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.6em 0; font-size: 9pt; }
  td, th { border: 1px solid #bbb; padding: 4px 8px; vertical-align: top; }
  th { background-color: #f0f0f0; font-weight: bold; }
  tr:nth-child(even) td { background-color: #f9f9f9; }
  img { max-width: 100%; height: auto; }
  a { color: #1a56db; }
  ul, ol { margin: 0.4em 0; padding-left: 1.5em; }
`;

/** True when `fileName` can be converted entirely client-side (excludes legacy .doc). */
export function isClientConvertible(fileName: string): boolean {
  return CLIENT_CONVERTIBLE_PATTERN.test(fileName);
}

/**
 * Downloads and converts an Office file to a full standalone HTML document,
 * ready to drop into an `<iframe srcDoc>`. The `<html>` tag always carries a
 * `zoom: 100%;` inline style as a stable marker string — callers that want to
 * change zoom can string-replace it (see `withZoom` below) without having to
 * re-run the (potentially expensive) parse step.
 *
 * Throws an Error with a descriptive message on failure (e.g. unsupported
 * extension, corrupt/password-protected file, network error) — callers
 * should fall back to the server-side office-to-pdf pipeline in that case.
 */
/** Aborts the source-file download if it stalls, so slow/flaky connections fail
 * fast enough for callers to fall back to the server-side pipeline instead of
 * hanging indefinitely. */
const FETCH_TIMEOUT_MS = 30_000;

export async function convertOfficeToHtml(sourceUrl: string, fileName: string): Promise<string> {
  if (!isClientConvertible(fileName)) {
    throw new Error(
      `.${ext(fileName)} must be converted server-side (legacy binary formats aren't supported in-browser).`,
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(sourceUrl, { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Downloading the source file timed out — the connection may be too slow.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`Failed to download source file (HTTP ${response.status}).`);
  }
  const buffer = await response.arrayBuffer();

  const extension = ext(fileName);
  let bodyHtml: string;
  try {
    if (extension === "docx") {
      bodyHtml = await docxToHtml(buffer);
    } else if (extension === "pptx" || extension === "ppsx") {
      bodyHtml = await pptxToHtml(buffer);
    } else {
      bodyHtml = xlsxToHtml(buffer);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse document — it may be corrupt or password-protected: ${msg}`);
  }

  return `<!DOCTYPE html>
<html lang="en" style="zoom: 100%;">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(fileName)}</title>
  <style>${PAGE_STYLES}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** Re-applies zoom to HTML produced by `convertOfficeToHtml` without re-parsing. */
export function withZoom(html: string, zoomPercent: number): string {
  return html.replace('style="zoom: 100%;"', `style="zoom: ${zoomPercent}%;"`);
}
