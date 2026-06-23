import html2pdf from "html2pdf.js";

export const downloadPageAsPDF = async (fileName = "SALEA-2026-Guide.pdf") => {
  try {
    const element = document.body;
    
    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    // Use html2pdf to generate and download
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error("PDF download failed:", error);
    throw error;
  }
};

export const downloadGuidePDF = async () => {
  return downloadPageAsPDF("SALEA-2026-Nomination-Guide.pdf");
};
