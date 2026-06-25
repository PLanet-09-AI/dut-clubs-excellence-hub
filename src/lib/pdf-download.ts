import html2pdf from "html2pdf.js";

/**
 * Inline all computed styles to isolate from CSS variables
 * and convert OKLCH to RGB format for html2canvas compatibility.
 */
function inlineAllStyles(element: Element): void {
  const walk = (el: Element) => {
    if (el.nodeType !== 1) return; // Skip non-element nodes
    
    const computed = window.getComputedStyle(el);
    const htmlEl = el as HTMLElement;
    
    // Properties to inline (colors + layout critical for rendering)
    const propsToInline = [
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
      "opacity",
      "display",
      "visibility",
      "width",
      "height",
      "margin",
      "marginTop",
      "marginRight",
      "marginBottom",
      "marginLeft",
      "padding",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "textAlign",
      "fontFamily",
    ];
    
    propsToInline.forEach((prop) => {
      let value = computed.getPropertyValue(prop);
      
      // Convert OKLCH to RGB
      if (value && value.includes("oklch")) {
        value = convertOklchToRgb(value) || value;
      }
      
      // Inline the style
      if (value) {
        htmlEl.style.setProperty(prop, value, "important");
      }
    });
    
    // Recursively process children
    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i]);
    }
  };
  
  walk(element);
}

/**
 * Converts OKLCH color values to RGB hex format.
 * Uses the browser's canvas context to leverage native color parsing.
 */
function convertOklchToRgb(oklchStr: string): string | null {
  if (!oklchStr.includes("oklch")) return null;
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  
  try {
    // Use canvas to convert oklch to rgb
    ctx.fillStyle = oklchStr;
    const computed = ctx.fillStyle;
    
    // Canvas converts to hex if supported
    if (computed.startsWith("#")) return computed;
    
    // Convert rgb/rgba to hex
    if (computed.startsWith("rgb")) {
      const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const [_, r, g, b] = match.map(Number);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
      }
    }
  } catch (e) {
    console.warn("Color conversion failed for:", oklchStr);
  }
  
  return null;
}

export const downloadPageAsPDF = async (fileName = "SALEA-2026-Guide.pdf") => {
  try {
    const element = document.body.cloneNode(true) as HTMLElement;
    
    // Remove style and link tags from clone to prevent stylesheet inheritance
    element.querySelectorAll("style, link[rel='stylesheet']").forEach((el) => el.remove());
    
    // Inline all computed styles and convert OKLCH to RGB
    inlineAllStyles(element);
    
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
