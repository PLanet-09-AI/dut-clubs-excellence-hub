/**
 * EvidenceUploader — per-question evidence upload widget.
 *
 * Each evidence label (e.g. "Official transcript", "Dean's List certificate")
 * gets its own dedicated upload zone so admins can clearly see which documents
 * were submitted for which requirement.
 *
 * Files are stored at:
 *   {basePath}/e{labelIndex}/{filename}
 *
 * The `files` prop is a Record keyed by "e0", "e1", etc. matching label index.
 */
import { useRef, useState, useCallback } from "react";
import {
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  deleteObject,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  convertOfficeToPdfBlob,
  isOfficeFileName,
  stripExtension,
} from "@/lib/office-to-pdf";
import { Upload, X, FileText, AlertCircle, Paperclip, Link2, ExternalLink, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Exported types ───────────────────────────────────────────────────────────

export type UploadedFile = {
  name: string;
  url: string;
  size: number;
  /** Firebase Storage path — used for deletion. Empty string for link entries. */
  path: string;
  /** Generated PDF preview URL for Office files */
  previewPdfUrl?: string;
  /** Firebase Storage path for generated preview PDF */
  previewPdfPath?: string;
  /** "sharepoint" = external link alternative, no file stored in Firebase */
  type?: "file" | "sharepoint";
};

/**
 * Keyed by evidence slot index as "e0", "e1", …
 * Each slot maps to the files uploaded for that specific evidence requirement.
 */
export type EvidenceUploads = Record<string, UploadedFile[]>;

// ─── Internal types ───────────────────────────────────────────────────────────

type InProgressUpload = {
  id: string;
  name: string;
  progress: number;
  error?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED = [
  // PDF
  "application/pdf",
  ".pdf",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc",
  ".docx",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls",
  ".xlsx",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  ".ppt",
  ".pptx",
  ".pps",
  ".ppsx",
  // Images
  "image/*",
].join(",");
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── SharePoint link preview modal ───────────────────────────────────────────

function SharePointPreview({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  // Attempt iframe embed: append ?web=1 for SharePoint, leave others as-is
  const embedUrl = url.includes("sharepoint.com") && !url.includes("?")
    ? `${url}?web=1`
    : url.includes("sharepoint.com")
    ? url.replace(/(\?|$)/, "?web=1&")
    : url;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl h-[80vh] rounded-xl overflow-hidden border border-primary/20 bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-primary/5 shrink-0">
          <Link2 className="h-4 w-4 text-primary" />
          <span className="flex-1 min-w-0 truncate text-sm font-medium">{name}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
            <ExternalLink className="h-3.5 w-3.5" /> Open in SharePoint
          </a>
          <button type="button" onClick={onClose} className="ml-2 rounded p-1 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <iframe
          src={embedUrl}
          title={name}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
        <p className="px-4 py-2 text-[10px] text-muted-foreground text-center shrink-0">
          Preview powered by SharePoint's built-in viewer · If blank, the link may require DUT login or "Anyone with the link" sharing.
        </p>
      </div>
    </div>
  );
}

// ─── Single-label uploader (internal) ────────────────────────────────────────

interface LabelUploaderProps {
  label: string;
  slotKey: string; // "e0", "e1", …
  basePath: string; // storage path including slotKey
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

function LabelUploader({ label, basePath, files, onFilesChange }: LabelUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<InProgressUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  const handleFiles = useCallback(
    (fileList: File[]) => {
      fileList.forEach((file) => {
        const id = crypto.randomUUID();

        if (file.size > MAX_BYTES) {
          setTasks((prev) => [
            ...prev,
            { id, name: file.name, progress: 0, error: `Exceeds ${MAX_MB} MB limit` },
          ]);
          return;
        }

        if (files.some((f) => f.name === file.name)) return; // deduplicate

        const path = `${basePath}/${file.name}`;
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, file);

        setTasks((prev) => [...prev, { id, name: file.name, progress: 0 }]);

        task.on(
          "state_changed",
          (snap) => {
            const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, progress: pct } : t)));
          },
          (err) => {
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, error: err.message } : t)));
          },
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            let previewPdfUrl: string | undefined;
            let previewPdfPath: string | undefined;

            if (isOfficeFileName(file.name)) {
              try {
                const convertedPdfBlob = await convertOfficeToPdfBlob(url, file.name);
                previewPdfPath = `${basePath}/__preview__/${stripExtension(file.name)}.pdf`;
                const previewRef = storageRef(storage, previewPdfPath);
                await uploadBytes(previewRef, convertedPdfBlob, { contentType: "application/pdf" });
                previewPdfUrl = await getDownloadURL(previewRef);
              } catch {
                // Keep original upload when conversion fails; preview can still open/download externally.
              }
            }

            setTasks((prev) => prev.filter((t) => t.id !== id));
            onFilesChange([
              ...files,
              {
                name: file.name,
                url,
                size: file.size,
                path,
                previewPdfUrl,
                previewPdfPath,
              },
            ]);
          },
        );
      });
    },
    [basePath, files, onFilesChange],
  );

  function addLink() {
    setLinkError("");
    const trimmed = linkInput.trim();
    if (!trimmed) { setLinkError("Paste a link first."); return; }
    let parsed: URL;
    try { parsed = new URL(trimmed); } catch { setLinkError("Not a valid URL."); return; }
    if (parsed.protocol !== "https:") { setLinkError("Only HTTPS links are accepted."); return; }
    if (files.some((f) => f.type === "sharepoint" && f.url === trimmed)) {
      setLinkError("This link is already added."); return;
    }
    // Derive a readable name from the URL
    const rawName = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "")
      || parsed.hostname;
    const name = rawName.length > 60 ? rawName.slice(0, 57) + "…" : rawName;
    onFilesChange([
      ...files,
      { name, url: trimmed, size: 0, path: "", type: "sharepoint" },
    ]);
    setLinkInput("");
    setShowLinkInput(false);
  }

  async function removeFile(file: UploadedFile) {
    if (file.type !== "sharepoint") {
      try { await deleteObject(storageRef(storage, file.path)); } catch { /* ignore */ }
      if (file.previewPdfPath) {
        try { await deleteObject(storageRef(storage, file.previewPdfPath)); } catch { /* ignore */ }
      }
    }
    onFilesChange(files.filter((f) => f !== file));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="rounded-lg border border-primary/15 bg-background/40">
      {preview && (
        <SharePointPreview url={preview.url} name={preview.name} onClose={() => setPreview(null)} />
      )}
      {/* Label row */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-primary/10">
        <Paperclip className="h-3 w-3 shrink-0 text-primary/70" />
        <span className="flex-1 text-xs font-medium text-foreground leading-snug">{label}</span>
        {files.length > 0 && (
          <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {files.length}
          </span>
        )}
      </div>

      {/* Uploaded files + links */}
      {files.length > 0 && (
        <div className="space-y-1 px-3 pt-2">
          {files.map((file, i) =>
            file.type === "sharepoint" ? (
              <div key={i} className="flex items-center gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-1.5">
                <Link2 className="h-3 w-3 shrink-0 text-blue-500" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setPreview({ url: file.url, name: file.name })}
                  className="shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-500/10 transition"
                  title="Preview"
                >
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary transition"
                  title="Open in SharePoint"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div key={file.path} className="flex items-center gap-2 rounded-md bg-primary/5 px-2 py-1.5">
                <FileText className="h-3 w-3 shrink-0 text-primary" />
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-xs text-foreground hover:text-primary hover:underline"
                >
                  {file.name}
                </a>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* In-progress uploads */}
      {tasks.length > 0 && (
        <div className="space-y-1.5 px-3 pt-2">
          {tasks.map((task) => (
            <div key={task.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {task.name}
                </span>
                {task.error ? (
                  <button
                    type="button"
                    onClick={() => setTasks((p) => p.filter((t) => t.id !== task.id))}
                    className="flex shrink-0 items-center gap-1 text-[10px] text-destructive hover:underline"
                  >
                    <AlertCircle className="h-3 w-3" /> {task.error} · dismiss
                  </button>
                ) : (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {Math.round(task.progress)}%
                  </span>
                )}
              </div>
              {!task.error && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-primary/15">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        className={`mx-3 my-2.5 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-2 text-xs transition select-none ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-primary/20 hover:border-primary/40 hover:bg-primary/5"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <Upload className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">
          Drop or <span className="font-medium text-primary">browse</span>
          <span className="ml-1.5 text-muted-foreground/60">
            · PDF, Word, Images · max {MAX_MB} MB
          </span>
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(Array.from(e.target.files));
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* SharePoint / link alternative */}
      <div className="mx-3 mb-2.5">
        <button
          type="button"
          onClick={() => { setShowLinkInput((v) => !v); setLinkError(""); }}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition"
        >
          <Link2 className="h-3 w-3" />
          {showLinkInput ? "Cancel link" : "Add SharePoint / OneDrive link instead"}
        </button>
        <AnimatePresence>
          {showLinkInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLink()}
                  placeholder="https://dutac.sharepoint.com/..."
                  className="flex-1 min-w-0 rounded-md border border-primary/20 bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={addLink}
                  className="shrink-0 rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium transition"
                >
                  Add
                </button>
              </div>
              {linkError && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
                  <AlertCircle className="h-3 w-3" /> {linkError}
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Share the file with "Anyone with the link (view)" for the reviewer to see it.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface EvidenceUploaderProps {
  /**
   * Firebase Storage base path for this question.
   * Each label slot will upload to `{basePath}/e{idx}/{filename}`.
   */
  basePath: string;
  /** Human-readable list of required evidence types */
  evidenceLabels: string[];
  /**
   * Map of slot key ("e0", "e1", …) → uploaded files for that slot.
   * Persisted in the form draft.
   */
  files: EvidenceUploads;
  onFilesChange: (files: EvidenceUploads) => void;
}

export function EvidenceUploader({
  basePath,
  evidenceLabels,
  files,
  onFilesChange,
}: EvidenceUploaderProps) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-primary/20 bg-primary/5">
      <p className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
        Supporting Evidence Required — upload each document below
      </p>
      <div className="space-y-2 px-3 pb-3">
        {evidenceLabels.map((label, idx) => {
          const key = `e${idx}`;
          return (
            <LabelUploader
              key={key}
              label={label}
              slotKey={key}
              basePath={`${basePath}/${key}`}
              files={files[key] ?? []}
              onFilesChange={(updated) => onFilesChange({ ...files, [key]: updated })}
            />
          );
        })}
      </div>
    </div>
  );
}
