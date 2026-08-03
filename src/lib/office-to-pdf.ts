/**
 * office-to-pdf — reusable client helpers for the Office → PDF pipeline.
 *
 * How it works (end to end):
 *   1. An Office file (DOC, DOCX, XLS, XLSX, PPT, PPTX, PPS, PPSX) lives at a
 *      public URL (e.g. a Firebase Storage download URL).
 *   2. The client POSTs `{ sourceUrl, fileName }` to `/api/office-to-pdf`.
 *   3. The Netlify function (netlify/functions/office-to-pdf.mts) downloads the
 *      file, parses it to HTML (mammoth / xlsx / jszip), renders the HTML to PDF
 *      with headless Chromium, uploads the PDF to Firebase Storage (cached by a
 *      hash of the source URL), and returns a small JSON payload with a signed
 *      Storage URL — never the PDF bytes, since embedding those in the Lambda
 *      response can exceed its ~6 MB size limit (Function.ResponseSizeTooLarge).
 *   4. The client uses that URL directly (e.g. as an <iframe src>) or fetches it
 *      into a Blob when an object URL is needed.
 *
 * Import these helpers anywhere you need Office → PDF behaviour instead of
 * re-implementing the fetch / regex in each component.
 */

/** Endpoint exposed by netlify.toml redirect → /.netlify/functions/office-to-pdf */
export const OFFICE_TO_PDF_ENDPOINT = "/api/office-to-pdf";

/** Matches the file extensions the conversion function accepts. */
export const OFFICE_FILE_PATTERN = /\.(doc|docx|ppt|pptx|pps|ppsx|xls|xlsx)$/i;

/** Matches common image extensions that can be previewed directly in-app. */
export const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|webp|bmp|svg|avif|tiff?)$/i;

/** True when the given file name is a convertible Office document. */
export function isOfficeFileName(name: string): boolean {
  return OFFICE_FILE_PATTERN.test(name);
}

/** Removes a trailing file extension, e.g. "report.docx" → "report". */
export function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * Calls the office-to-pdf function, which converts (or reuses a cached
 * conversion of) the source file and returns a signed Storage URL for the
 * rendered PDF — never the PDF bytes themselves, since embedding those in the
 * function response can exceed the Lambda response size limit
 * (Function.ResponseSizeTooLarge) for larger documents.
 */
export async function convertOfficeToPdfUrl(
  sourceUrl: string,
  fileName: string,
): Promise<string> {
  const response = await fetch(OFFICE_TO_PDF_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceUrl, fileName }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Office-to-PDF conversion failed.");
  }

  const { pdfUrl } = (await response.json()) as { pdfUrl?: string };
  if (!pdfUrl) {
    throw new Error("Office-to-PDF conversion did not return a PDF URL.");
  }
  return pdfUrl;
}

/**
 * Calls the office-to-pdf function and returns the rendered PDF as a Blob by
 * fetching the signed Storage URL it returns. Prefer `convertOfficeToPdfUrl`
 * directly when you just need a URL (e.g. for an <iframe src>) — it avoids
 * this extra download and lets the browser cache the PDF via Storage/CDN.
 * Throws an Error (with the server message when available) on failure.
 */
export async function convertOfficeToPdfBlob(
  sourceUrl: string,
  fileName: string,
): Promise<Blob> {
  const pdfUrl = await convertOfficeToPdfUrl(sourceUrl, fileName);
  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error("Failed to download the converted PDF.");
  }
  return await pdfResponse.blob();
}

/**
 * Converts an Office file and returns a browser object URL for the PDF.
 * Remember to call `URL.revokeObjectURL` when the URL is no longer needed.
 */
export async function convertOfficeToPdfObjectUrl(
  sourceUrl: string,
  fileName: string,
): Promise<string> {
  const blob = await convertOfficeToPdfBlob(sourceUrl, fileName);
  return URL.createObjectURL(blob);
}
