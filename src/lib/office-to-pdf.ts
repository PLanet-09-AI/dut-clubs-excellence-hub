/**
 * office-to-pdf — reusable client helpers for the Office → PDF pipeline.
 *
 * How it works (end to end):
 *   1. An Office file (DOC, DOCX, XLS, XLSX, PPT, PPTX, PPS, PPSX) lives at a
 *      public URL (e.g. a Firebase Storage download URL).
 *   2. The client POSTs `{ sourceUrl, fileName }` to `/api/office-to-pdf`.
 *   3. The Netlify function (netlify/functions/office-to-pdf.mts) downloads the
 *      file, parses it to HTML (mammoth / xlsx / jszip), renders the HTML to PDF
 *      with headless Chromium, and returns `application/pdf`.
 *   4. The client receives a PDF Blob it can preview in an <iframe>, turn into an
 *      object URL, or re-upload as a cached preview.
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
 * Calls the office-to-pdf function and returns the rendered PDF as a Blob.
 * Throws an Error (with the server message when available) on failure.
 */
export async function convertOfficeToPdfBlob(
  sourceUrl: string,
  fileName: string,
): Promise<Blob> {
  const response = await fetch(OFFICE_TO_PDF_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceUrl, fileName }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Office-to-PDF conversion failed.");
  }

  return await response.blob();
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
