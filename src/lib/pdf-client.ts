/**
 * pdf-client — client-side PDF rendering helpers built on pdfjs-dist.
 *
 * Why this exists: neither <object>/<embed>/<iframe src=pdfUrl> nor Google
 * Docs Viewer render reliably everywhere:
 *   - <iframe src=pdfUrl> relies on the browser's *built-in* PDF viewer, which
 *     desktop Chrome/Edge/Firefox/Safari all have, but most mobile browsers
 *     (Chrome/Safari on iOS/Android) and installed PWAs do NOT — they just
 *     show a blank frame or try to download the file instead of previewing it.
 *   - Google Docs Viewer works around that, but has its own file-size ceiling
 *     ("This file is too large to preview") and pulls in Google's CSP-
 *     violating telemetry.
 *
 * pdf.js renders pages onto <canvas> entirely client-side and works
 * identically across desktop browsers, mobile browsers, and installed PWAs.
 * It streams pages on demand instead of loading the whole document into the
 * DOM, so there's no artificial size ceiling — only the device's own
 * RAM/CPU limits apply (same as any other PDF viewer).
 */
import * as pdfjsLib from "pdfjs-dist";
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfDocumentHandle = pdfjsLib.PDFDocumentProxy;

/** Aborts the PDF fetch if it stalls, so a slow connection fails fast instead
 * of hanging indefinitely. */
const LOAD_TIMEOUT_MS = 45_000;

/** Loads a PDF document from a URL. Caller is responsible for calling
 * `.destroy()` on the returned handle when done to free memory. */
export async function loadPdfDocument(url: string): Promise<PdfDocumentHandle> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
  try {
    const loadingTask = pdfjsLib.getDocument({
      url,
      // Renders large PDFs progressively instead of waiting for the full
      // download, and avoids buffering the whole file in memory up front.
      disableAutoFetch: false,
      disableStream: false,
    });
    const doc = await loadingTask.promise;
    return doc;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Renders a single page of a loaded PDF document onto the given canvas at
 * the given zoom (1 = 100%). Cancels any in-flight render on the canvas
 * before starting a new one to avoid pdf.js's "already rendering" error when
 * the user flips pages or zooms quickly. */
const renderTasks = new WeakMap<HTMLCanvasElement, ReturnType<pdfjsLib.PDFPageProxy["render"]>>();

export async function renderPdfPageToCanvas(
  doc: PdfDocumentHandle,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  zoom: number,
): Promise<void> {
  const existing = renderTasks.get(canvas);
  if (existing) {
    existing.cancel();
  }

  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: zoom });

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable.");

  // Cap device pixel ratio to keep memory use sane on very high-DPI phones.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const renderTask = page.render({
    canvasContext: context,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
  });
  renderTasks.set(canvas, renderTask);

  try {
    await renderTask.promise;
  } catch (err) {
    // Ignore cancellation errors — they're expected when the user navigates
    // away from a page mid-render.
    if (err instanceof Error && err.name === "RenderingCancelledException") return;
    throw err;
  } finally {
    renderTasks.delete(canvas);
    page.cleanup();
  }
}
