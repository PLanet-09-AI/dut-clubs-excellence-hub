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
import { Upload, X, FileText, AlertCircle, Paperclip } from "lucide-react";
import { motion } from "framer-motion";

// ─── Exported types ───────────────────────────────────────────────────────────

export type UploadedFile = {
  name: string;
  url: string;
  size: number;
  /** Firebase Storage path — used for deletion */
  path: string;
  /** Generated PDF preview URL for Office files */
  previewPdfUrl?: string;
  /** Firebase Storage path for generated preview PDF */
  previewPdfPath?: string;
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

const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*";
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const OFFICE_FILE_PATTERN = /\.(doc|docx|ppt|pptx|pps|ppsx|xls|xlsx)$/i;

function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

function isOfficeFileName(name: string): boolean {
  return OFFICE_FILE_PATTERN.test(name);
}

async function convertOfficeToPdfBlob(sourceUrl: string, fileName: string): Promise<Blob> {
  const response = await fetch("/api/office-to-pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceUrl, fileName }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Office-to-PDF conversion failed.");
  }

  return await response.blob();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  async function removeFile(file: UploadedFile) {
    try {
      await deleteObject(storageRef(storage, file.path));
    } catch {
      /* ignore */
    }
    if (file.previewPdfPath) {
      try {
        await deleteObject(storageRef(storage, file.previewPdfPath));
      } catch {
        /* ignore */
      }
    }
    onFilesChange(files.filter((f) => f.path !== file.path));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="rounded-lg border border-primary/15 bg-background/40">
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

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="space-y-1 px-3 pt-2">
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-2 rounded-md bg-primary/5 px-2 py-1.5"
            >
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
          ))}
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
      <p className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
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
