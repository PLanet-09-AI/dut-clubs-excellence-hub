/**
 * Direct download from Firebase Storage URLs / static assets.
 * Avoids html2pdf library issues with OKLCH colors and provides reliable downloads.
 */

/** PDF asset locations */
const PDF_URLS = {
  guide: "https://firebasestorage.googleapis.com/v0/b/student-services-745d5.firebasestorage.app/o/SALEA%20Step-by-Step%20POE%20Guide%20(1).pdf?alt=media&token=97471b40-b31c-4c3a-bb0d-e32a4b9e1471",
  session1Programme: "/SALEA-2026-Session-1-Programme.pdf",
  session2Programme: "/SALEA-2026-Session-2-Programme.pdf",
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
 * Download the Session 1 (morning) programme PDF.
 */
export const downloadSession1ProgrammePDF = async () => {
  downloadFromUrl(PDF_URLS.session1Programme, "SALEA-2026-Session-1-Programme.pdf");
};

/**
 * Download the Session 2 (evening) programme PDF.
 */
export const downloadSession2ProgrammePDF = async () => {
  downloadFromUrl(PDF_URLS.session2Programme, "SALEA-2026-Session-2-Programme.pdf");
};
