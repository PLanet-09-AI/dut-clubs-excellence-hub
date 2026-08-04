/**
 * PdfCanvasViewer — renders a PDF client-side via pdf.js onto a <canvas>.
 *
 * Works identically on desktop browsers, mobile browsers, and installed
 * PWAs — unlike <iframe src=pdfUrl> (relies on the browser's built-in PDF
 * viewer, which most mobile browsers/PWAs don't have) or Google Docs Viewer
 * (has its own file-size ceiling and CSP-violating telemetry).
 */
import { useEffect, useRef, useState } from "react";
import { loadPdfDocument, renderPdfPageToCanvas, type PdfDocumentHandle } from "@/lib/pdf-client";

export interface PdfCanvasViewerProps {
  url: string;
  page: number;
  zoomPercent: number;
  onDocumentLoad?: (pageCount: number) => void;
  onError?: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  className?: string;
}

export function PdfCanvasViewer({
  url,
  page,
  zoomPercent,
  onDocumentLoad,
  onError,
  onLoadingChange,
  className,
}: PdfCanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PdfDocumentHandle | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  // Load the document whenever the URL changes.
  useEffect(() => {
    let cancelled = false;
    onLoadingChange?.(true);
    setDocUrl(null);

    (async () => {
      try {
        const doc = await loadPdfDocument(url);
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef.current?.destroy();
        docRef.current = doc;
        setDocUrl(url);
        onDocumentLoad?.(doc.numPages);
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
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, []);

  // Render the current page whenever the doc, page number, or zoom changes.
  useEffect(() => {
    if (!docRef.current || docUrl !== url || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    onLoadingChange?.(true);

    (async () => {
      try {
        const clampedPage = Math.min(Math.max(1, page), docRef.current!.numPages);
        await renderPdfPageToCanvas(docRef.current!, clampedPage, canvas, zoomPercent / 100);
        if (!cancelled) onLoadingChange?.(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        onError?.(`Failed to render page: ${msg}`);
        onLoadingChange?.(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docUrl, url, page, zoomPercent]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="mx-auto block" />
    </div>
  );
}
