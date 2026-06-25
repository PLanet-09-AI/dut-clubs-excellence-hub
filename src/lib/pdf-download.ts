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
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: { orientation: "portrait" as const, unit: "mm", format: "a4" },
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

/**
 * Generate and download the event programme PDF with 2-session schedule
 */
export const downloadProgrammePDF = async () => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              color: #1a1a1a;
              background: white;
              padding: 40px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #d4a574;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 32px;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .header p {
              font-size: 14px;
              color: #666;
            }
            .venue {
              background: #f8f9fa;
              padding: 15px;
              border-left: 4px solid #d4a574;
              margin-bottom: 30px;
              font-size: 13px;
            }
            .venue strong {
              color: #2c3e50;
            }
            .session {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            .session-title {
              background: #d4a574;
              color: white;
              padding: 12px 15px;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .session-time {
              color: #666;
              font-size: 13px;
              margin-bottom: 15px;
            }
            .schedule-item {
              display: flex;
              margin-bottom: 12px;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
            }
            .time {
              width: 70px;
              font-weight: bold;
              color: #2c3e50;
              font-size: 13px;
            }
            .event {
              flex: 1;
              padding-left: 15px;
              font-size: 13px;
            }
            .event-title {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 3px;
            }
            .event-desc {
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SALEA 2026 Judge Programme</h1>
            <p>Student Academic & Leadership Excellence Awards</p>
          </div>

          <div class="venue">
            <strong>Venue:</strong> DUT Sports Center<br>
            <strong>Address:</strong> 76 Steve Biko Road, DUT Sports Center<br>
            <strong>Date:</strong> TBC
          </div>

          <div class="session">
            <div class="session-title">SESSION 1: Morning Awards</div>
            <div class="session-time">📅 10:00 – 13:00</div>
            <div class="schedule-item">
              <div class="time">10:00</div>
              <div class="event">
                <div class="event-title">Welcome & Opening Remarks</div>
                <div class="event-desc">Opening ceremony and introduction to judges</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">10:20</div>
              <div class="event">
                <div class="event-title">Choir Performance</div>
                <div class="event-desc">Student choir entertainment</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">10:45</div>
              <div class="event">
                <div class="event-title">Academic Excellence Award</div>
                <div class="event-desc">Presentation and winner announcement</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">11:15</div>
              <div class="event">
                <div class="event-title">Community Impact Award</div>
                <div class="event-desc">Recognition of community contributions</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">11:45</div>
              <div class="event">
                <div class="event-title">Refreshments Break</div>
                <div class="event-desc">Light refreshments and networking</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">12:15</div>
              <div class="event">
                <div class="event-title">Emerging Leaders Award</div>
                <div class="event-desc">Celebration of rising leaders</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">12:45</div>
              <div class="event">
                <div class="event-title">Closing Remarks</div>
                <div class="event-desc">Session conclusion and transition announcement</div>
              </div>
            </div>
          </div>

          <div class="session">
            <div class="session-title">SESSION 2: Evening Awards & Gala Dinner</div>
            <div class="session-time">📅 16:00 – 22:00</div>
            <div class="schedule-item">
              <div class="time">16:00</div>
              <div class="event">
                <div class="event-title">Guest Reception</div>
                <div class="event-desc">Welcome reception and cocktails</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">16:45</div>
              <div class="event">
                <div class="event-title">Seating & Dinner Service</div>
                <div class="event-desc">Guests seated, three-course dinner begins</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">17:15</div>
              <div class="event">
                <div class="event-title">Welcome & Opening Remarks</div>
                <div class="event-desc">Opening remarks for evening session</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">17:45</div>
              <div class="event">
                <div class="event-title">Choir Performance</div>
                <div class="event-desc">Student choir entertainment during dinner</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">18:15</div>
              <div class="event">
                <div class="event-title">Academic Excellence Award</div>
                <div class="event-desc">Presentation and winner announcement</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">18:45</div>
              <div class="event">
                <div class="event-title">Community Impact Award</div>
                <div class="event-desc">Recognition of community contributions</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">19:15</div>
              <div class="event">
                <div class="event-title">Dinner Service Continues</div>
                <div class="event-desc">Dessert and beverages service</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">19:45</div>
              <div class="event">
                <div class="event-title">Leadership Excellence Award</div>
                <div class="event-desc">Premier award for exceptional leaders</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">20:15</div>
              <div class="event">
                <div class="event-title">Sportsperson of the Year Award</div>
                <div class="event-desc">Recognition of athletic excellence</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">20:45</div>
              <div class="event">
                <div class="event-title">Closing Remarks</div>
                <div class="event-desc">Session conclusion and thanks</div>
              </div>
            </div>
            <div class="schedule-item">
              <div class="time">21:00</div>
              <div class="event">
                <div class="event-title">After-Party & Dancing</div>
                <div class="event-desc">DJ performance and social celebration until 22:00</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <strong>Important Notes:</strong><br>
            • Please arrive 15 minutes before your assigned session start time<br>
            • Formal attire required for both sessions<br>
            • Judges will receive credential badges at reception<br>
            • For queries, contact the awards coordination team
          </div>
        </body>
      </html>
    `;

    const element = document.createElement("div");
    element.innerHTML = html;
    
    const opt = {
      margin: 10,
      filename: "SALEA-2026-Judge-Programme.pdf",
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: { orientation: "portrait" as const, unit: "mm", format: "a4" },
    };

    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error("Programme PDF download failed:", error);
    throw error;
  }
};
