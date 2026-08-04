/**
 * PdfCanvasViewer — renders every page of a PDF client-side via pdf.js onto
 * stacked <canvas> elements in a single scrollable pane, like a normal PDF
 * reader. Works identically on desktop browsers, mobile browsers, and
 * installed PWAs — unlike <iframe src=pdfUrl> (relies on the browser's
 * built-in PDF viewer, which many mobile browsers/PWAs/embedders lack) or
 * Google Docs Viewer (has its own file-size ceiling and CSP-violating
 * telemetry).
 *
 * Pages are sized as soon as the document loads (cheap — just reads each
 * page's dimensions, no rendering), so scrolling feels natural immediately.
 * The actual bitmap for each page is only rendered once it scrolls near the
 * viewport (IntersectionObserver), so opening a 200-page document doesn't
 * render all 200 pages up front.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  destroyPdfDocument,
  getPageBaseSize,
  loadPdfDocument,
  renderPdfPageToCanvas,
  type PdfDocumentHandle,
} from "@/lib/pdf-client";

export interface PdfCanvasViewerProps {
  url: string;
  /** 1-based page number to scroll to when it changes (e.g. from Page +/- controls). */
  scrollToPage?: number;
  zoomPercent: number;
  onDocumentLoad?: (pageCount: number) => void;
  onError?: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  className?: string;
}

export function PdfCanvasViewer({
  url,
  scrollToPage,
  zoomPercent,
  onDocumentLoad,
  onError,
  onLoadingChange,
  className,
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());
  const docRef = useRef<PdfDocumentHandle | null>(null);
  const renderedAtZoom = useRef(new Map<number, number>());
  const [numPages, setNumPages] = useState(0);
  const [pageBaseSizes, setPageBaseSizes] = useState<Map<number, { width: number; height: number }>>(
    new Map(),
  );

  const pageNumbers = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);

  // Load the document whenever the URL changes; size every page up front.
  useEffect(() => {
    let cancelled = false;
    onLoadingChange?.(true);
    setNumPages(0);
    setPageBaseSizes(new Map());
    renderedAtZoom.current.clear();

    (async () => {
      try {
        const doc = await loadPdfDocument(url);
        if (cancelled) {
          void destroyPdfDocument(doc);
          return;
        }
        if (docRef.current) void destroyPdfDocument(docRef.current);
        docRef.current = doc;
        onDocumentLoad?.(doc.numPages);

        const sizes = new Map<number, { width: number; height: number }>();
        for (let p = 1; p <= doc.numPages; p++) {
          if (cancelled) return;
          sizes.set(p, await getPageBaseSize(doc, p));
        }
        if (cancelled) return;
        setPageBaseSizes(sizes);
        setNumPages(doc.numPages);
        onLoadingChange?.(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        onError?.(`Failed to load PDF: ${msg}`);
        onLoadingChange?.(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Clean up the document on unmount.
  useEffect(() => {
    return () => {
      if (docRef.current) void destroyPdfDocument(docRef.current);
      docRef.current = null;
    };
  }, []);

  const renderPage = useCallback(
    async (pageNumber: number) => {
      const canvas = canvasRefs.current.get(pageNumber);
      if (!canvas || !docRef.current) return;
      if (renderedAtZoom.current.get(pageNumber) === zoomPercent) return;
      try {
        await renderPdfPageToCanvas(docRef.current, pageNumber, canvas, zoomPercent / 100);
        renderedAtZoom.current.set(pageNumber, zoomPercent);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onError?.(`Failed to render page ${pageNumber}: ${msg}`);
      }
    },
    [zoomPercent, onError],
  );

  // Lazily render each page's bitmap once it scrolls near the viewport.
  useEffect(() => {
    if (!numPages || !containerRef.current) return;
    const root = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const pageNumber = Number((entry.target as HTMLElement).dataset.page);
          if (pageNumber) void renderPage(pageNumber);
        }
      },
      { root, rootMargin: "400px 0px" },
    );
    const slots = root.querySelectorAll<HTMLElement>("[data-page]");
    slots.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, renderPage]);

  // Zoom changed — re-render whichever pages were already rendered.
  useEffect(() => {
    for (const pageNumber of renderedAtZoom.current.keys()) {
      void renderPage(pageNumber);
    }
  }, [zoomPercent, renderPage]);

  // Scroll to the requested page (e.g. Page +/- controls).
  useEffect(() => {
    if (!scrollToPage || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(`[data-page="${scrollToPage}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollToPage]);

  return (
    <div ref={containerRef} className={`overflow-auto ${className ?? ""}`}>
      <div className="flex flex-col items-center gap-3 py-2">
        {pageNumbers.map((pageNumber) => {
          const base = pageBaseSizes.get(pageNumber);
          const scale = zoomPercent / 100;
          return (
            <div
              key={pageNumber}
              data-page={pageNumber}
              style={base ? { width: base.width * scale, height: base.height * scale } : undefined}
              className="shrink-0 bg-white shadow-sm"
            >
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(pageNumber, el);
                  else canvasRefs.current.delete(pageNumber);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

