import { useState } from "react";
import { FileArchive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exportNominationsZip,
  type ExportNomination,
  type ExportProgress,
} from "@/lib/nomination-export";

type ZipMessage = { tone: "ok" | "warn" | "error"; text: string };

/**
 * State + runner for a ZIP export: a narrative report (Word + HTML) per nominee
 * with every question and answer, plus all uploaded attachments, foldered by question.
 */
export function useZipExport() {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [message, setMessage] = useState<ZipMessage | null>(null);
  const busy = progress !== null;

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
          text: `Downloaded ${result.nominationCount} nomination(s), but ${result.failed.length} of ${result.fileCount + result.failed.length} attachment(s) couldn't be fetched — see "MISSING FILES.txt" in the ZIP.`,
        });
      } else {
        setMessage({
          tone: "ok",
          text: `Downloaded ${result.nominationCount} nomination(s) with ${result.fileCount} attachment(s).`,
        });
      }
    } catch (err) {
      setMessage({
        tone: "error",
        text: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
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

/** Progress bar + result message for a running/finished ZIP export. */
export function ZipExportStatus({ zip }: { zip: ReturnType<typeof useZipExport> }) {
  if (!zip.busy && !zip.message) return null;
  const pct =
    zip.progress && zip.progress.total > 0
      ? Math.round((zip.progress.done / zip.progress.total) * 100)
      : zip.progress?.phase === "finishing"
        ? 100
        : 0;
  return (
    <div className="mt-2 space-y-1" role="status">
      {zip.busy && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{zip.busyText}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      {zip.message && (
        <p
          className={`text-xs ${
            zip.message.tone === "ok"
              ? "text-green-700"
              : zip.message.tone === "warn"
                ? "text-amber-700"
                : "text-destructive"
          }`}
        >
          {zip.message.text}
        </p>
      )}
    </div>
  );
}

type Props = {
  nominations: ExportNomination[];
  label: string;
  /** Overrides the ZIP's root folder name (defaults to the category name). */
  zipLabel?: string;
  size?: "sm" | "default";
  className?: string;
};

/** Self-contained button that exports the given nominations as one ZIP. */
export function ZipDownloadButton({ nominations, label, zipLabel, size = "default", className }: Props) {
  const zip = useZipExport();
  return (
    <div className="flex flex-col items-start">
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
      {zip.message && <ZipExportStatus zip={{ ...zip, busy: false }} />}
    </div>
  );
}
