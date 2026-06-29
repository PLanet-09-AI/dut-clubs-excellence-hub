/**
 * Direct download from Firebase Storage URLs.
 * Avoids html2pdf library issues with OKLCH colors and provides reliable downloads.
 */
import jsPDF from "jspdf";

/** Firebase Storage URLs for PDFs */
const PDF_URLS = {
  guide: "https://firebasestorage.googleapis.com/v0/b/student-services-745d5.firebasestorage.app/o/SALEA%20Step-by-Step%20POE%20Guide%20(1).pdf?alt=media&token=97471b40-b31c-4c3a-bb0d-e32a4b9e1471",
  // Note: programme PDF is now generated dynamically
};

// Session schedules data (same as in EventProgram.tsx)
const session1Schedule = [
  { time: "10:00", title: "Welcome & Opening Address", desc: "Dean's remarks and programme introduction" },
  { time: "10:15", title: "Cultural Opening — DUT Choir", desc: "Performance of the institutional anthem" },
  { time: "10:30", title: "Awards: Academic Excellence", desc: "Honouring scholarly achievement" },
  { time: "11:00", title: "Awards: Community Impact", desc: "For service that uplifts our communities" },
  { time: "11:30", title: "Light Refreshments", desc: "Coffee, tea, and pastries" },
  { time: "12:00", title: "Awards: Emerging Leaders (First Year)", desc: "Recognising first-year excellence" },
  { time: "12:30", title: "Closing & Awards Celebration", desc: "Recognition of all nominees and winners" },
  { time: "13:00", title: "Session Ends", desc: "Thank you and departure" },
];

const session2Schedule = [
  { time: "16:00", title: "Welcome Reception", desc: "Foyer · Champagne, canapés, photo wall" },
  { time: "16:45", title: "Guests Seated", desc: "Main Hall · Ushers will guide you" },
  { time: "17:00", title: "Welcome & Opening Address", desc: "Dean's remarks" },
  { time: "17:15", title: "Cultural Opening — DUT Choir", desc: "Performance of the institutional anthem" },
  { time: "17:30", title: "Awards: Academic Excellence", desc: "Honouring scholarly achievement" },
  { time: "18:00", title: "Awards: Community Impact", desc: "For service that uplifts our communities" },
  { time: "18:30", title: "Three-Course Banquet", desc: "Plated dinner with wine pairing" },
  { time: "19:30", title: "Awards: Leadership & Cultural", desc: "SRC, clubs, residences and ambassadors" },
  { time: "20:10", title: "Sportsperson of the Year", desc: "Headline award presentation" },
  { time: "20:30", title: "Closing Address & Toast", desc: "A salute to all nominees" },
  { time: "21:00", title: "After-Party & Dancing", desc: "Live DJ until 22:00" },
];

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
 * Generate and download the event programme PDF with both session schedules.
 */
export const downloadProgrammePDF = async () => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Title
    doc.setFontSize(24);
    doc.setFont("Helvetica", "bold");
    doc.text("SALEA 2026", margin, yPosition);
    
    yPosition += 8;
    doc.setFontSize(18);
    doc.text("Event Programme", margin, yPosition);

    // Subtitle
    yPosition += 12;
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.text("Fred Crookes Sports Centre, 76 Steve Biko Road", margin, yPosition);

    // Venue info
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Doors open 18:00 · Curtain 19:00 sharp", margin, yPosition);
    doc.setTextColor(0, 0, 0);

    yPosition += 18;

    // Function to add session
    const addSession = (schedule: typeof session1Schedule, sessionTitle: string) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Session heading
      doc.setFontSize(14);
      doc.setFont("Helvetica", "bold");
      doc.text(sessionTitle, margin, yPosition);
      
      yPosition += 10;

      // Session content
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");

      schedule.forEach((item) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }

        // Time
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(0, 102, 204); // Blue color for time
        const timeText = item.time;
        doc.text(timeText, margin, yPosition);

        // Title
        const titleX = margin + 20;
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const titleLines = doc.splitTextToSize(item.title, contentWidth - 20);
        doc.text(titleLines, titleX, yPosition);

        yPosition += titleLines.length * 5;

        // Description
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        const descLines = doc.splitTextToSize(item.desc, contentWidth - 20);
        doc.text(descLines, titleX, yPosition);

        yPosition += descLines.length * 4 + 5;
        doc.setFontSize(10);
      });

      yPosition += 8;
    };

    // Add Session 1
    addSession(session1Schedule, "Session 1: 10:00 – 13:00 (Morning Awards)");

    yPosition += 5;

    // Add Session 2
    addSession(session2Schedule, "Session 2: 16:00 – 22:00 (Evening Gala & Awards)");

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);

    // Download the PDF
    doc.save("SALEA-2026-Programme.pdf");
  } catch (error) {
    console.error("Failed to generate programme PDF:", error);
  }
};
