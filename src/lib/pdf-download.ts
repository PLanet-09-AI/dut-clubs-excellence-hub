/**
 * Direct download from Firebase Storage URLs.
 * Avoids html2pdf library issues with OKLCH colors and provides reliable downloads.
 */

/** Firebase Storage URLs for PDFs */
const PDF_URLS = {
  guide: "https://firebasestorage.googleapis.com/v0/b/student-services-745d5.firebasestorage.app/o/SALEA%20Step-by-Step%20POE%20Guide%20(1).pdf?alt=media&token=97471b40-b31c-4c3a-bb0d-e32a4b9e1471",
  programme: "https://firebasestorage.googleapis.com/v0/b/student-services-745d5.firebasestorage.app/o/SALEA%202026%20Judge%20Programme.pdf?alt=media",
};

/**
 * Download a file directly from a URL.
 * Creates a temporary anchor element and triggers the download.
 */
function downloadFromUrl(url: string, fileName: string): void {
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Failed to download from URL:", error);
    // Fallback: open in new tab if download fails
    window.open(url, "_blank");
  }
}

/**
 * Download the nomination guide PDF from Firebase Storage.
 */
export const downloadGuidePDF = async () => {
  downloadFromUrl(PDF_URLS.guide, "SALEA-2026-Nomination-Guide.pdf");
};

/**
 * Download the judge programme PDF from Firebase Storage.
 */
export const downloadProgrammePDF = async () => {
  downloadFromUrl(PDF_URLS.programme, "SALEA-2026-Judge-Programme.pdf");
};
