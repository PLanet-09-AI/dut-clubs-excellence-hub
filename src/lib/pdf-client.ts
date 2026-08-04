/**
 * pdf-client — client-side PDF rendering helpers built on pdfjs-dist.
 *
 * Why this exists: neither <object>/<embed>/<iframe src=pdfUrl> nor Google
 * Docs Viewer render reliably everywhere:
 *   - <iframe src=pdfUrl> relies on the browser's *built-in* PDF viewer.
 *     Desktop Chrome/Edge/Firefox/Safari all have one, but most mobile
 *     browsers (iOS/Android) and installed PWAs do NOT, and neither do some
 *     desktop Chromium embedders (Electron apps, webviews) — they just show
 *     a blank frame or silently trigger a file download instead of
 *     previewing it.
 *   - Google Docs Viewer works around that, but has its own file-size
 *     ceiling ("This file is too large to preview") and pulls in Google's
 *     CSP-violating telemetry.
 *
 * pdf.js renders pages onto <canvas> entirely client-side and works
 * identically everywhere. It streams pages on demand instead of loading the
 * whole document into the DOM, so there's no artificial size ceiling — only
 * the device's own RAM/CPU limits apply (same as any other PDF viewer).
 *
 * IMPORTANT: pdfjs-dist references browser-only globals (DOMMatrix, etc.) at
 * module-evaluation time, which crashes SSR (Node has no DOMMatrix). All
 * imports here are therefore fully dynamic (`import()`), so the library is
 * only ever loaded in the browser, never during server rendering.
 */
import type * as PdfJsLib from "pdfjs-dist";

export type PdfDocumentHandle = PdfJsLib.PDFDocumentProxy;

let pdfjsLibPromise: Promise<typeof PdfJsLib> | null = null;

function loadPdfjsLib(): Promise<typeof PdfJsLib> {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      const [lib, workerModule] = await Promise.all([
        import("pdfjs-dist"),
        // eslint-disable-next-line import/no-unresolved
        import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
      ]);
      lib.GlobalWorkerOptions.workerSrc = workerModule.default;
      return lib;
    })();
  }
  return pdfjsLibPromise;
}

/** Returns a page's unscaled (100%) width/height in points, without
 * rendering it — used to size placeholder page slots in a scrollable
 * multi-page viewer before the page itself has been rendered. */
export async function getPageBaseSize(
  doc: PdfDocumentHandle,
  pageNumber: number,
): Promise<{ width: number; height: number }> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  return { width: viewport.width, height: viewport.height };
}

/** Frees a loaded PDF document's resources. `PDFDocumentProxy` itself has no
 * `destroy()` method — it's exposed on the `loadingTask` that produced it. */
export async function destroyPdfDocument(doc: PdfDocumentHandle): Promise<void> {
  await doc.loadingTask.destroy();
}

/** Aborts the PDF load if no data has arrived for this long, so a stalled
 * connection fails fast (and surfaces a retryable error) instead of hanging
 * indefinitely. Reset on every progress tick (see below) rather than being a
 * single fixed deadline for the whole download, so large files on slow-but-
 * working connections aren't killed just for taking a while — only a true
 * stall triggers it. */
const STALL_TIMEOUT_MS = 45_000;

/** Loads a PDF document from a URL. Caller is responsible for calling
 * `.destroy()` on the returned handle when done to free memory. */
export function loadPdfDocument(url: string): Promise<PdfDocumentHandle> {
  return loadPdfjsLib().then(
    (pdfjsLib) =>
      new Promise<PdfDocumentHandle>((resolve, reject) => {
        const loadingTask = pdfjsLib.getDocument({
          url,
          // Renders large PDFs progressively instead of waiting for the full
          // download, and avoids buffering the whole file in memory up front.
          disableAutoFetch: false,
          disableStream: false,
        });

        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout>;
        const resetStallTimer = () => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (settled) return;
            settled = true;
            void loadingTask.destroy();
            reject(
              new Error(
                `PDF load stalled: no data received for ${STALL_TIMEOUT_MS / 1000}s.`,
              ),
            );
          }, STALL_TIMEOUT_MS);
        };
        loadingTask.onProgress = () => resetStallTimer();
        resetStallTimer();

        loadingTask.promise.then(
          (doc) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            resolve(doc);
          },
          (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            reject(err);
          },
        );
      }),
  );
}

/** Renders a single page of a loaded PDF document onto the given canvas at
 * the given zoom (1 = 100%). Cancels any in-flight render on the canvas
 * before starting a new one to avoid pdf.js's "already rendering" error when
 * the user flips pages or zooms quickly. */
const renderTasks = new WeakMap<HTMLCanvasElement, ReturnType<PdfJsLib.PDFPageProxy["render"]>>();

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
    canvas,
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

