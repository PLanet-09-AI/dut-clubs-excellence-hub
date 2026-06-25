import html2pdf from "html2pdf.js";

/**
 * Converts OKLCH color values to RGB hex format.
 * Pattern: oklch(L C H) → #RRGGBB
 */
function convertOklchToRgb(oklchStr: string): string {
  const match = oklchStr.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return oklchStr; // Return unchanged if not oklch
  
  // Create a temporary canvas to leverage browser's color conversion
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return oklchStr;
  
  try {
    // Set a temporary fill style with the oklch color
    ctx.fillStyle = oklchStr;
    // Get computed style which browser converts to rgb
    const computed = ctx.fillStyle;
    // If browser understands oklch, it will convert to rgb hex
    if (computed.startsWith("#")) return computed;
    if (computed.startsWith("rgb")) {
      // Convert rgb(r, g, b) to #RRGGBB
      const rgbMatch = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [_, r, g, b] = rgbMatch.map(Number);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
      }
    }
  } catch (e) {
    // If conversion fails, return original
  }
  return oklchStr;
}

/**
 * Converts all OKLCH colors in computed styles to RGB hex.
 * Necessary because html2canvas doesn't support OKLCH color format.
 */
function convertElementStylesToSupportedFormat(element: Element): void {
  // Recursively process all elements
  const walk = (el: Element) => {
    const computed = window.getComputedStyle(el);
    const style = el as HTMLElement;
    
    // List of CSS properties that may contain colors
    const colorProps = [
      "color",
      "backgroundColor",
      "borderColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "outlineColor",
      "textDecorationColor",
      "caretColor",
    ];
    
    colorProps.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && value.includes("oklch")) {
        const converted = convertOklchToRgb(value);
        if (converted !== value) {
          style.style.setProperty(prop, converted);
        }
      }
    });
    
    // Process child elements
    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i]);
    }
  };
  
  walk(element);
}

export const downloadPageAsPDF = async (fileName = "SALEA-2026-Guide.pdf") => {
  try {
    const element = document.body.cloneNode(true) as HTMLElement;
    
    // Convert all OKLCH colors to RGB hex before rendering
    convertElementStylesToSupportedFormat(element);
    
    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
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
