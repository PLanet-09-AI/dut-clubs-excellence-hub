/**
 * compress-pdf — client helper for the on-demand PDF compression pipeline.
 *
 * Large evidence PDFs (scanned registers, photo-heavy certificates, etc.) can
 * be slow/unreliable to stream directly from Firebase Storage, especially on
 * weaker connections. For files over COMPRESS_THRESHOLD_BYTES, callers should
 * request a compressed "preview" copy instead of loading the original —
 * trading some visual fidelity for a much smaller, more reliable download.
 * The original file is never modified; it's still used for Open/Download.
 *
 * Compressed copies are cached server-side (keyed by source URL hash), so
 * repeat previews of the same file are instant after the first compression.
 */

/** Endpoint exposed by netlify.toml redirect → /.netlify/functions/compress-pdf */
export const COMPRESS_PDF_ENDPOINT = "/api/compress-pdf";

/** Files at or above this size get an on-demand compressed preview instead
 * of loading the original directly. */
export const COMPRESS_THRESHOLD_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Requests a compressed preview copy of a large PDF and returns its signed
 * Storage URL. Throws an Error (with the server message when available) on
 * failure — callers should fall back to the original `sourceUrl` in that case
 * rather than blocking the preview entirely.
 */
export async function compressPdfUrl(sourceUrl: string): Promise<string> {
  const response = await fetch(COMPRESS_PDF_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceUrl }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "PDF compression failed.");
  }

  const { pdfUrl } = (await response.json()) as { pdfUrl?: string };
  if (!pdfUrl) {
    throw new Error("PDF compression did not return a PDF URL.");
  }
  return pdfUrl;
}
