import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, FileArchive, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exportNominationsZip,
  type ExportNomination,
  type ExportProgress,
} from "@/lib/nomination-export";

type ZipMessage = { tone: "ok" | "warn" | "error"; title: string; text: string };

/**
 * State + runner for a ZIP export: a narrative report (Word + HTML) per nominee
 * with every question and answer, plus all uploaded attachments, foldered by question.
 */
export function useZipExport() {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [message, setMessage] = useState<ZipMessage | null>(null);
  const busy = progress !== null;

  // Closing or reloading the tab mid-export leaves an empty/invalid .zip behind.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  /** Call directly from a click handler — the "Save as" dialog must open before any await. */
  async function run(nominations: ExportNomination[], options: { zipLabel?: string } = {}) {
    if (busy || nominations.length === 0) return;
    setMessage(null);
    setProgress({ done: 0, total: 0, phase: "fetching" });
    try {
      const result = await exportNominationsZip(nominations, {
        zipLabel: options.zipLabel,
        onProgress: setProgress,
      });
      if (result.cancelled) {
        setMessage(null);
      } else if (result.failed.length > 0) {
        setMessage({
          tone: "warn",
          title: "ZIP saved — you can open it now",
          text: `"${result.zipName}": ${result.nominationCount} nomination(s). ${result.failed.length} of ${result.fileCount + result.failed.length} attachment(s) couldn't be fetched — see "MISSING FILES.txt" inside the ZIP.`,
        });
      } else {
        setMessage({
          tone: "ok",
          title: "ZIP saved — you can open it now",
          text: `"${result.zipName}": ${result.nominationCount} nomination(s) with ${result.fileCount} attachment(s).`,
        });
      }
    } catch (err) {
      setMessage({
        tone: "error",
        title: "Download failed",
        text: `${err instanceof Error ? err.message : String(err)}. Any partial ZIP is incomplete — delete it and try again.`,
      });
    } finally {
      setProgress(null);
    }
  }

  const busyText =
    progress?.phase === "finishing"
      ? "Writing narrative reports…"
      : progress && progress.total > 0
        ? `Downloading files ${progress.done}/${progress.total}…`
        : "Preparing…";

  return { run, progress, message, busy, busyText, clearMessage: () => setMessage(null) };
}

/**
 * Floating panel (bottom-right) shown while a ZIP export runs and after it finishes.
 * It stays visible wherever the admin scrolls, because opening the .zip before the
 * export finishes shows Windows' "Compressed (zipped) folder is invalid" error.
 */
export function ZipExportStatus({ zip }: { zip: ReturnType<typeof useZipExport> }) {
  if (!zip.busy && !zip.message) return null;
  if (typeof document === "undefined") return null; // SSR
  const pct =
    zip.progress && zip.progress.total > 0
      ? Math.round((zip.progress.done / zip.progress.total) * 100)
      : zip.progress?.phase === "finishing"
        ? 100
        : 0;

  // Portal to <body> so no transformed/overflow-hidden ancestor can clip the fixed panel.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] w-[min(92vw,380px)] rounded-xl border border-primary/30 bg-white p-4 shadow-2xl"
    >
      {zip.busy ? (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Building ZIP — keep this tab open
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{zip.busyText}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Don't open the .zip file yet — it stays empty (and Windows calls it "invalid") until
            this panel says it's saved.
          </p>
        </>
      ) : (
        zip.message && (
          <div className="flex items-start gap-2">
            {zip.message.tone === "error" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            ) : (
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 flex-shrink-0 ${zip.message.tone === "ok" ? "text-green-600" : "text-amber-600"}`}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{zip.message.title}</p>
              <p className="mt-0.5 break-words text-xs text-muted-foreground">{zip.message.text}</p>
            </div>
            <button
              type="button"
              onClick={zip.clearMessage}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      )}
    </div>,
    document.body,
  );
}

type Props = {
  nominations: ExportNomination[];
  label: string;
  /** Overrides the ZIP's name (defaults to the category name). */
  zipLabel?: string;
  size?: "sm" | "default";
  className?: string;
};

/** Self-contained button that exports the given nominations as one ZIP. */
export function ZipDownloadButton({ nominations, label, zipLabel, size = "default", className }: Props) {
  const zip = useZipExport();
  return (
    <>
      <Button
        type="button"
        size={size}
        variant="outline"
        onClick={() => zip.run(nominations, { zipLabel })}
        disabled={zip.busy || nominations.length === 0}
        className={className ?? "border-primary/40 text-primary"}
      >
        {zip.busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileArchive className="mr-2 h-4 w-4" />
        )}
        {zip.busy ? zip.busyText : label}
      </Button>
      <ZipExportStatus zip={zip} />
    </>
  );
}
