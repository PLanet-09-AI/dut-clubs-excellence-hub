/**
 * narrative-docx.ts
 *
 * Builds a minimal but valid Word (.docx) document from a list of simple blocks.
 * A .docx is a ZIP of WordprocessingML parts, so JSZip is all that is needed.
 */
import JSZip from "jszip";

export type DocBlock =
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "field"; label: string; value: string }
  | { kind: "prompt"; text: string }
  | { kind: "body"; text: string }
  | { kind: "muted"; text: string }
  | { kind: "bullet"; label?: string; text: string; note?: string };

// Characters not allowed in XML 1.0 would corrupt the document — strip them.
const INVALID_XML = /[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu;

function xml(text: string): string {
  return String(text ?? "")
    .replace(INVALID_XML, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type RunStyle = { bold?: boolean; italic?: boolean; color?: string; size?: number };

function run(text: string, style: RunStyle = {}): string {
  const props = [
    style.bold ? "<w:b/>" : "",
    style.italic ? "<w:i/>" : "",
    style.color ? `<w:color w:val="${style.color}"/>` : "",
    style.size ? `<w:sz w:val="${style.size}"/><w:szCs w:val="${style.size}"/>` : "",
  ].join("");
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

function para(runs: string, opts: { style?: string; spacingAfter?: number; indent?: number } = {}): string {
  const pPr = [
    opts.style ? `<w:pStyle w:val="${opts.style}"/>` : "",
    opts.spacingAfter !== undefined ? `<w:spacing w:after="${opts.spacingAfter}"/>` : "",
    opts.indent ? `<w:ind w:left="${opts.indent}" w:hanging="240"/>` : "",
  ].join("");
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${runs}</w:p>`;
}

function blockXml(block: DocBlock): string {
  switch (block.kind) {
    case "title":
      return para(run(block.text), { style: "Title" });
    case "subtitle":
      return para(run(block.text, { color: "595959", size: 26 }), { spacingAfter: 240 });
    case "h1":
      return para(run(block.text), { style: "Heading1" });
    case "h2":
      return para(run(block.text), { style: "Heading2" });
    case "field":
      return para(run(`${block.label}: `, { bold: true }) + run(block.value || "—"), {
        spacingAfter: 40,
      });
    case "prompt":
      return para(run(block.text, { italic: true, color: "404040" }));
    case "body":
      // One paragraph per line so line breaks in the answer are preserved.
      return (block.text || "")
        .split(/\r?\n/)
        .map((line) => para(run(line)))
        .join("");
    case "muted":
      return para(run(block.text, { italic: true, color: "808080", size: 18 }));
    case "bullet":
      return para(
        run("•  ") +
          (block.label ? run(`${block.label}: `, { color: "595959" }) : "") +
          run(block.text) +
          (block.note ? run(`  ${block.note}`, { color: "B00020", size: 18 }) : ""),
        { indent: 480, spacingAfter: 40 },
      );
  }
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
  <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-ZA"/></w:rPr></w:rPrDefault>
  <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
  <w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
  <w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="B8860B"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr>
  <w:rPr><w:b/><w:caps/><w:color w:val="8A6508"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
  <w:pPr><w:keepNext/><w:spacing w:before="280" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr>
  <w:rPr><w:b/><w:color w:val="8A6508"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
</w:styles>`;

export async function buildDocx(blocks: DocBlock[], title: string): Promise<Uint8Array> {
  const body = blocks.map(blockXml).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xml(title)}</dc:title><dc:creator>SALEA 2026 Admin Panel</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("word/_rels/document.xml.rels", DOC_RELS);
  zip.file("word/document.xml", document);
  zip.file("word/styles.xml", STYLES);
  zip.file("docProps/core.xml", core);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
