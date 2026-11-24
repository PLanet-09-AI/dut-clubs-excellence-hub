/**
 * nomination-export.ts
 *
 * Exports one or more nominations as a single ZIP, one folder per nominee:
 *
 *   <Category>/                       (only when several categories are exported)
 *     Summary.csv
 *     01 - <Nominee> (<student #>)/
 *       Narrative Report.docx         every question, answer, details, evidence index
 *       Narrative Report.html         same, with clickable links to the files below
 *       Q1 - <Section>/<Evidence type> - <file>
 *   MISSING FILES.txt                 only if some attachments could not be fetched
 *
 * Path segments are length-capped so full paths stay under Windows' 260-character
 * limit when the ZIP is extracted with Explorer's "Extract All".
 *
 * The ZIP is streamed (client-zip): attachments are fetched a few at a time and
 * written straight to disk when the browser supports the File System Access API
 * (Chrome / Edge), so multi-GB exports don't have to fit in memory.
 *
 * Fetching Storage files requires the bucket's CORS config to allow GET from the
 * site's origin (see cors.json / scripts/set-storage-cors.mjs).
 */
import { downloadZip } from "client-zip";
import { getBlob, ref as storageRef } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { AWARD_CATEGORIES, AWARD_THEME } from "@/data/awards";
import { buildDocx, type DocBlock } from "@/lib/narrative-docx";

export type ExportFile = {
  name: string;
  url: string;
  size: number;
  path: string;
};

export type ExportNomination = {
  id: string;
  createdAt: { toDate?: () => Date } | string | null;
  categoryId: string;
  categoryName: string;
  nomineeName: string;
  nomineeEmail: string;
  studentNumber: string;
  faculty: string;
  yearOfStudy: string;
  nominatorName: string;
  nominatorEmail: string;
  nominatorRelationship: string;
  answers?: Record<string, string>;
  uploads?: Record<string, Record<string, ExportFile[]>>;
  status: string;
};

export type ExportProgress = {
  done: number;
  total: number;
  phase: "fetching" | "finishing";
};

export type ExportResult = {
  zipName: string;
  nominationCount: number;
  fileCount: number;
  failed: { nominee: string; category: string; file: string; url: string }[];
  /** True when the user dismissed the "Save as" dialog. */
  cancelled?: boolean;
};

type Question = {
  id: string;
  section: string;
  prompt: string;
  wordLimit?: number;
  evidence?: string[];
};

type PlannedFile = { zipPath: string; relPath: string; file: ExportFile; job: ReportJob };

type EvidenceEntry = { label: string; file: ExportFile; relPath: string };

type ReportJob = {
  nom: ExportNomination;
  prefix: string;
  folderName: string;
  questions: Question[];
  evidence: Map<string, EvidenceEntry[]>;
  missing: Set<string>;
};

type ZipEntry = { name: string; input: Blob | string | Uint8Array; lastModified?: Date };

const FETCH_AHEAD = 4;

// ─── helpers ─────────────────────────────────────────────────────────────────

// Windows Explorer can't extract paths over 260 characters. Real admins extract into
// e.g. "C:\Users\<name>\OneDrive - Durban University of Technology\Desktop\<zip name>\"
// (~110 chars), so paths inside the ZIP are kept to ≤ ~140:
//   category 24 + nominee 38 + question 30 + file 48 + 3 slashes = 143.
const MAX_CATEGORY = 24;
const MAX_NOMINEE = 38;
const MAX_QUESTION = 30;
const MAX_EVIDENCE_LABEL = 22;
const MAX_FILE = 48;

/** Make a string safe as a single path segment on Windows, macOS and Linux. */
function safeSegment(value: string, maxLength: number): string {
  const cleaned = (value || "")
    .replace(/[\\/:]/g, "-")
    // eslint-disable-next-line no-control-regex
    .replace(/[*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const truncated = cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
  // Windows rejects segments ending in a dot or space.
  return truncated.replace(/[. ]+$/, "").trim() || "Untitled";
}

/** safeSegment, but cut at a word boundary when that keeps most of the text. */
function shorten(value: string, maxLength: number): string {
  const full = safeSegment(value, 1000);
  if (full.length <= maxLength) return full;
  const cut = full.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(" ");
  let base = lastSpace >= maxLength * 0.4 ? cut.slice(0, lastSpace) : full.slice(0, maxLength);
  // Drop dangling connectors/punctuation: "Photos, posters or" → "Photos, posters".
  let prev = "";
  while (prev !== base) {
    prev = base;
    base = base
      .replace(/[\s,;&/(-]+$/, "")
      .replace(/\s+(and|or|of|the|for|to|with|from|in|on|by|a)$/i, "");
  }
  return base.replace(/[. ]+$/, "").trim() || full.slice(0, maxLength).trim() || "Untitled";
}

/** Like safeSegment, but keeps the file extension when shortening. */
function safeFileName(name: string, maxLength: number): string {
  const cleaned = safeSegment(name, 1000);
  if (cleaned.length <= maxLength) return cleaned;
  const dot = cleaned.lastIndexOf(".");
  const ext = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : "";
  const base = shorten(cleaned.slice(0, cleaned.length - ext.length), maxLength - ext.length);
  return `${base}${ext}`;
}

/** Return a name unique within `used` (case-insensitive), adding " (2)", " (3)"… before the extension. */
function uniqueName(safe: string, used: Set<string>): string {
  if (!used.has(safe.toLowerCase())) {
    used.add(safe.toLowerCase());
    return safe;
  }
  const dot = safe.lastIndexOf(".");
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : "";
  let n = 2;
  while (used.has(`${base} (${n})${ext}`.toLowerCase())) n++;
  const result = `${base} (${n})${ext}`;
  used.add(result.toLowerCase());
  return result;
}

/** "01 - Nominee Name (22201242)" — student # only when it is a single plain number. */
function nomineeFolderName(index: number, nom: ExportNomination): string {
  const num = String(index + 1).padStart(2, "0");
  const studentNo = (nom.studentNumber || "").trim();
  const suffix = /^\d{6,10}$/.test(studentNo) ? ` (${studentNo})` : "";
  const name = shorten(nom.nomineeName || "Unnamed", MAX_NOMINEE - num.length - 3 - suffix.length);
  return `${num} - ${name}${suffix}`;
}

/** Category folder: the category's short name (e.g. "Dean's Prestigious") when known. */
function categoryFolderName(categoryId: string, categoryName: string): string {
  const short = AWARD_CATEGORIES.find((c) => c.id === categoryId)?.short;
  return shorten(short || categoryName || categoryId || "Uncategorised", MAX_CATEGORY);
}

/** "<Evidence type> - <original file name>", length-capped with the extension kept. */
function evidenceFileName(label: string, fileName: string): string {
  const prefix = label ? `${shorten(label, MAX_EVIDENCE_LABEL)} - ` : "";
  return `${prefix}${safeFileName(fileName || "file", MAX_FILE - prefix.length)}`;
}

function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function encodeHref(relativePath: string): string {
  return relativePath.split("/").map(encodeURIComponent).join("/");
}

function formatDate(ts: ExportNomination["createdAt"]): string {
  if (!ts) return "—";
  if (typeof ts === "object" && ts.toDate) {
    return ts.toDate().toLocaleString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return String(ts);
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function wordCount(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Questions for a nomination: the category definition, or answer keys for custom categories. */
function questionsFor(nom: ExportNomination): Question[] {
  const cat = AWARD_CATEGORIES.find((c) => c.id === nom.categoryId);
  if (cat) return cat.questions;
  const ids = new Set<string>([
    ...Object.keys(nom.answers ?? {}),
    ...Object.keys(nom.uploads ?? {}),
  ]);
  return Array.from(ids).map((id) => ({ id, section: "Response", prompt: id }));
}

async function fetchFileBlob(file: ExportFile): Promise<Blob> {
  // 1) Tokenised download URL (works regardless of Storage security rules).
  if (file.url) {
    try {
      const res = await fetch(file.url);
      if (res.ok) return await res.blob();
    } catch {
      /* fall through to SDK */
    }
  }
  // 2) Storage SDK using the signed-in user's credentials.
  if (file.path) return await getBlob(storageRef(storage, file.path));
  throw new Error("File has no URL or storage path");
}

function detailFields(nom: ExportNomination): [string, string][] {
  return [
    ["Category", nom.categoryName || nom.categoryId],
    ["Nominee", nom.nomineeName],
    ["Student number", nom.studentNumber],
    ["Email", nom.nomineeEmail],
    ["Faculty", nom.faculty],
    ["Year of study", nom.yearOfStudy],
    ["Status", nom.status],
    ["Submitted", formatDate(nom.createdAt)],
  ];
}

function nominatorFields(nom: ExportNomination): [string, string][] {
  return [
    ["Name", nom.nominatorName],
    ["Email", nom.nominatorEmail],
    ["Relationship", nom.nominatorRelationship],
  ];
}

function wordNote(answer: string, limit?: number): string {
  const words = wordCount(answer);
  if (limit) return `${words} / ${limit} words${words > limit ? " (over limit)" : ""}`;
  return answer ? `${words} words` : "";
}

// ─── narrative reports ───────────────────────────────────────────────────────

function buildReportBlocks(job: ReportJob): DocBlock[] {
  const { nom, questions, evidence, missing } = job;
  const blocks: DocBlock[] = [
    { kind: "title", text: nom.nomineeName || "Unnamed nominee" },
    {
      kind: "subtitle",
      text: `${nom.categoryName || nom.categoryId} — Narrative Report · ${AWARD_THEME.title}`,
    },
    { kind: "h1", text: "Nominee details" },
    ...detailFields(nom).map(([label, value]) => ({ kind: "field" as const, label, value })),
    { kind: "h1", text: "Nominated by" },
    ...nominatorFields(nom).map(([label, value]) => ({ kind: "field" as const, label, value })),
    { kind: "h1", text: "Questions & answers" },
  ];

  questions.forEach((q, i) => {
    const answer = nom.answers?.[q.id] ?? "";
    blocks.push({ kind: "h2", text: `Question ${i + 1} · ${q.section}` });
    blocks.push({ kind: "prompt", text: q.prompt });
    blocks.push(
      answer
        ? { kind: "body", text: answer }
        : { kind: "muted", text: "No written response provided." },
    );
    const note = wordNote(answer, q.wordLimit);
    if (note) blocks.push({ kind: "muted", text: note });
    const files = evidence.get(q.id) ?? [];
    if (files.length) {
      blocks.push({ kind: "field", label: "Supporting evidence", value: `${files.length} file(s)` });
      for (const e of files) {
        const isMissing = missing.has(e.relPath);
        blocks.push({
          kind: "bullet",
          label: e.label,
          text: `${e.file.name} (${formatSize(e.file.size)}) — ${isMissing ? e.file.url : e.relPath}`,
          note: isMissing ? "[not included in ZIP — open link]" : undefined,
        });
      }
    }
  });

  blocks.push({
    kind: "muted",
    text: `Generated ${new Date().toLocaleString("en-ZA")} · Nomination ID ${nom.id}`,
  });
  return blocks;
}

function buildReportHtml(job: ReportJob): string {
  const { nom, questions, evidence, missing } = job;
  const row = ([k, v]: [string, string]) =>
    `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v || "—")}</td></tr>`;

  const questionBlocks = questions
    .map((q, i) => {
      const answer = nom.answers?.[q.id] ?? "";
      const words = wordCount(answer);
      const files = evidence.get(q.id) ?? [];
      const note = wordNote(answer, q.wordLimit);
      const over = q.wordLimit ? words > q.wordLimit : false;
      const evidenceHtml = files.length
        ? `<div class="evidence"><h4>Supporting evidence</h4><ul>${files
            .map((e) => {
              const link = missing.has(e.relPath)
                ? `<a href="${escapeHtml(e.file.url)}">${escapeHtml(e.file.name)}</a> <span class="missing">(not included in ZIP — open online)</span>`
                : `<a href="${encodeHref(e.relPath)}">${escapeHtml(e.file.name)}</a>`;
              return `<li><span class="label">${escapeHtml(e.label)}:</span> ${link} <span class="meta">${formatSize(e.file.size)}</span></li>`;
            })
            .join("")}</ul></div>`
        : "";
      return `<section class="q">
  <p class="section">Question ${i + 1} · ${escapeHtml(q.section)}</p>
  <p class="prompt">${escapeHtml(q.prompt)}</p>
  <div class="answer${answer ? "" : " empty"}">${answer ? escapeHtml(answer) : "No written response provided."}</div>
  ${note ? `<span class="meta${over ? " over" : ""}">${escapeHtml(note)}</span>` : ""}
  ${evidenceHtml}
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(nom.nomineeName)} — Narrative Report</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; max-width: 820px; margin: 32px auto; padding: 0 24px; line-height: 1.55; }
  header { border-bottom: 3px solid #b8860b; padding-bottom: 12px; margin-bottom: 24px; }
  header .kicker { font: 600 11px/1.2 Arial, sans-serif; letter-spacing: .2em; text-transform: uppercase; color: #8a6508; margin: 0; }
  h1 { margin: 6px 0 2px; font-size: 28px; }
  header .sub { margin: 0; color: #555; font-family: Arial, sans-serif; font-size: 14px; }
  h2 { font-size: 16px; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: .08em; color: #8a6508; margin: 28px 0 8px; }
  table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 13px; }
  th, td { text-align: left; padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }
  th { width: 30%; background: #faf6ec; font-weight: 600; }
  .q { border: 1px solid #e3dcc8; border-radius: 8px; padding: 14px 18px; margin: 14px 0; page-break-inside: avoid; }
  .q .section { font: 700 11px/1.2 Arial, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #8a6508; margin: 0 0 6px; }
  .q .prompt { font-style: italic; color: #444; margin: 0 0 10px; }
  .q .answer { white-space: pre-wrap; }
  .q .answer.empty { color: #999; font-style: italic; }
  .meta { font: 11px Arial, sans-serif; color: #777; }
  .meta.over { color: #b00020; font-weight: 700; }
  .evidence h4 { font: 700 12px Arial, sans-serif; margin: 12px 0 4px; }
  .evidence ul { margin: 0; padding-left: 18px; font-family: Arial, sans-serif; font-size: 13px; }
  .evidence .label { color: #555; }
  .missing { color: #b00020; font-size: 11px; }
  footer { margin-top: 32px; font: 11px Arial, sans-serif; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { margin: 0; } a { color: inherit; } }
</style>
</head>
<body>
<header>
  <p class="kicker">${escapeHtml(AWARD_THEME.title)} · ${escapeHtml(AWARD_THEME.eventName)}</p>
  <h1>${escapeHtml(nom.nomineeName)}</h1>
  <p class="sub">${escapeHtml(nom.categoryName || nom.categoryId)} — Narrative Report</p>
</header>
<h2>Nominee details</h2>
<table>${detailFields(nom).map(row).join("")}</table>
<h2>Nominated by</h2>
<table>${nominatorFields(nom).map(row).join("")}</table>
<h2>Questions &amp; answers</h2>
${questionBlocks || "<p>No responses recorded.</p>"}
<footer>Generated ${escapeHtml(new Date().toLocaleString("en-ZA"))} · Nomination ID ${escapeHtml(nom.id)}</footer>
</body>
</html>`;
}

function buildSummaryCsv(jobs: ReportJob[]): string {
  const header = [
    "Folder",
    "Nominee",
    "Student #",
    "Email",
    "Faculty",
    "Year",
    "Status",
    "Nominator",
    "Nominator email",
    "Relationship",
    "Submitted",
    "Attachments",
    "Missing attachments",
  ];
  const lines = jobs.map((job) => {
    const { nom } = job;
    const fileCount = Object.values(nom.uploads ?? {})
      .flatMap((s) => Object.values(s ?? {}))
      .flat().length;
    return [
      job.folderName,
      nom.nomineeName,
      nom.studentNumber,
      nom.nomineeEmail,
      nom.faculty,
      nom.yearOfStudy,
      nom.status,
      nom.nominatorName,
      nom.nominatorEmail,
      nom.nominatorRelationship,
      formatDate(nom.createdAt),
      fileCount,
      job.missing.size,
    ]
      .map(csvCell)
      .join(",");
  });
  return "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
}

// ─── planning ────────────────────────────────────────────────────────────────

function planExport(nominations: ExportNomination[]) {
  const byCategory = new Map<string, ExportNomination[]>();
  for (const n of nominations) {
    const key = n.categoryName || n.categoryId || "Uncategorised";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(n);
  }
  const singleCategory = byCategory.size === 1;

  const planned: PlannedFile[] = [];
  const categories: { prefix: string; jobs: ReportJob[] }[] = [];
  const usedCategoryFolders = new Set<string>();

  for (const [categoryName, noms] of byCategory) {
    // Single category: nominee folders sit at the top of the ZIP (the ZIP itself
    // is named after the category). Several categories: one folder per category.
    const catPrefix = singleCategory
      ? ""
      : `${uniqueName(categoryFolderName(noms[0].categoryId, categoryName), usedCategoryFolders)}/`;
    const usedFolders = new Set<string>();
    const sorted = [...noms].sort((a, b) =>
      (a.nomineeName || "").localeCompare(b.nomineeName || ""),
    );
    const jobs: ReportJob[] = [];

    sorted.forEach((nom, i) => {
      const folderName = uniqueName(nomineeFolderName(i, nom), usedFolders);
      const job: ReportJob = {
        nom,
        prefix: `${catPrefix}${folderName}/`,
        folderName,
        questions: questionsFor(nom),
        evidence: new Map(),
        missing: new Set(),
      };
      const usedPerFolder = new Map<string, Set<string>>();

      const addFile = (questionId: string, folderRel: string, label: string, file: ExportFile) => {
        if (!usedPerFolder.has(folderRel)) usedPerFolder.set(folderRel, new Set());
        const fileName = uniqueName(evidenceFileName(label, file.name), usedPerFolder.get(folderRel)!);
        const relPath = `${folderRel}/${fileName}`;
        planned.push({ zipPath: `${job.prefix}${relPath}`, relPath, file, job });
        if (!job.evidence.has(questionId)) job.evidence.set(questionId, []);
        job.evidence.get(questionId)!.push({ label, file, relPath });
      };

      const handledSlots = new Set<string>();
      job.questions.forEach((q, qi) => {
        const slots = nom.uploads?.[q.id];
        if (!slots) return;
        const qFolder = shorten(`Q${qi + 1} - ${q.section}`, MAX_QUESTION);
        const slotKeys = Object.keys(slots).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true }),
        );
        for (const slotKey of slotKeys) {
          const idx = Number(slotKey.replace(/^e/, ""));
          const label =
            Number.isInteger(idx) && q.evidence?.[idx] ? q.evidence[idx] : `Evidence ${slotKey}`;
          for (const file of slots[slotKey] ?? []) addFile(q.id, qFolder, label, file);
          handledSlots.add(`${q.id}/${slotKey}`);
        }
      });

      // Uploads whose question no longer exists in the category definition.
      for (const [qid, slots] of Object.entries(nom.uploads ?? {})) {
        for (const [slotKey, files] of Object.entries(slots ?? {})) {
          if (handledSlots.has(`${qid}/${slotKey}`)) continue;
          for (const file of files ?? []) addFile(qid, "Other evidence", "", file);
        }
      }

      jobs.push(job);
    });

    categories.push({ prefix: catPrefix, jobs });
  }

  return { planned, categories };
}

// ─── output sink ─────────────────────────────────────────────────────────────

type SaveFileHandle = {
  createWritable: () => Promise<WritableStream<Uint8Array>>;
  /** Chrome/Edge: deletes the file. Not available everywhere. */
  remove?: () => Promise<void>;
};

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<SaveFileHandle>;

type SaveTarget = { handle: SaveFileHandle; writable: WritableStream<Uint8Array> };

/**
 * Must be called synchronously from the click handler (before any await) so the
 * browser still treats the "Save as" dialog as user-initiated.
 *
 * Note: Chrome creates the chosen .zip as an EMPTY file straight away and only
 * fills it when the stream closes — opening it before then shows "invalid ZIP".
 */
function openSaveTarget(fileName: string): Promise<SaveTarget | null> | null {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (typeof picker !== "function") return null;
  return picker({
    suggestedName: fileName,
    types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
  }).then(
    async (handle) => ({ handle, writable: await handle.createWritable() }),
    (err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return null; // picker unavailable (e.g. iframe) → fall back to blob download
    },
  );
}

/** Remove the empty placeholder file left behind when an export fails. */
async function discardSaveTarget(target: SaveTarget) {
  try {
    await target.writable.abort();
  } catch {
    /* already errored/closed */
  }
  try {
    await target.handle.remove?.();
  } catch {
    /* not supported — leave it */
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later — revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function exportNominationsZip(
  nominations: ExportNomination[],
  options: { zipLabel?: string; onProgress?: (p: ExportProgress) => void } = {},
): Promise<ExportResult> {
  if (nominations.length === 0) throw new Error("No nominations to export.");

  const categoryIds = new Set(nominations.map((n) => n.categoryId));
  // Kept short: Explorer's "Extract All" uses the ZIP name as the destination folder,
  // which counts towards the 260-character path limit.
  const label =
    options.zipLabel ??
    (categoryIds.size === 1
      ? categoryFolderName(nominations[0].categoryId, nominations[0].categoryName)
      : "All Nominations");
  const zipName = `SALEA - ${shorten(label, 28)} ${new Date().toISOString().split("T")[0]}.zip`;

  // Ask where to save first — this must happen before any await.
  const targetPromise = openSaveTarget(zipName);
  let target: SaveTarget | null = null;
  if (targetPromise) {
    try {
      target = await targetPromise;
    } catch {
      return { zipName, nominationCount: 0, fileCount: 0, failed: [], cancelled: true };
    }
  }

  const { planned, categories } = planExport(nominations);
  const failed: ExportResult["failed"] = [];
  const total = planned.length;
  let done = 0;
  options.onProgress?.({ done, total, phase: "fetching" });

  async function* entries(): AsyncGenerator<ZipEntry> {
    // Attachments, fetched FETCH_AHEAD at a time but written in order.
    const pending: Promise<ZipEntry | null>[] = [];
    let next = 0;
    const startNext = () => {
      if (next >= planned.length) return;
      const item = planned[next++];
      pending.push(
        fetchFileBlob(item.file)
          .then((blob): ZipEntry => ({ name: item.zipPath, input: blob }))
          .catch(() => {
            failed.push({
              nominee: item.job.nom.nomineeName,
              category: item.job.nom.categoryName || item.job.nom.categoryId,
              file: item.file.name,
              url: item.file.url,
            });
            item.job.missing.add(item.relPath);
            return null;
          })
          .finally(() => {
            done++;
            options.onProgress?.({ done, total, phase: "fetching" });
          }),
      );
    };
    for (let i = 0; i < FETCH_AHEAD; i++) startNext();
    while (pending.length) {
      const entry = await pending.shift()!;
      startNext();
      if (entry) yield entry;
    }

    // Reports last, so files that failed to download are flagged in them.
    options.onProgress?.({ done: total, total, phase: "finishing" });
    for (const { prefix, jobs } of categories) {
      for (const job of jobs) {
        // One bad report must not break the whole ZIP — the HTML version still goes in.
        let docx: Uint8Array | null = null;
        try {
          docx = await buildDocx(buildReportBlocks(job), `${job.nom.nomineeName} — Narrative Report`);
        } catch (err) {
          console.error("Narrative .docx failed for", job.nom.id, err);
        }
        if (docx) yield { name: `${job.prefix}Narrative Report.docx`, input: docx };
        yield { name: `${job.prefix}Narrative Report.html`, input: buildReportHtml(job) };
      }
      yield { name: `${prefix}Summary.csv`, input: buildSummaryCsv(jobs) };
    }

    if (failed.length > 0) {
      yield {
        name: "MISSING FILES.txt",
        input: [
          "The following attachments could not be downloaded into this ZIP.",
          "Open each link below while signed in to retrieve it manually.",
          "",
          ...failed.map((f) => `[${f.category}] ${f.nominee} — ${f.file}\r\n    ${f.url}`),
        ].join("\r\n"),
      };
    }
  }

  const response = downloadZip(entries());
  if (target) {
    try {
      // preventAbort lets us clean up the placeholder file ourselves on failure.
      await response.body!.pipeTo(target.writable, { preventAbort: true });
    } catch (err) {
      await discardSaveTarget(target);
      throw err;
    }
  } else {
    triggerDownload(await response.blob(), zipName);
  }

  return {
    zipName,
    nominationCount: nominations.length,
    fileCount: total - failed.length,
    failed,
  };
}
