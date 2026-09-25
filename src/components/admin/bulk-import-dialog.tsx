import { useRef, useState } from "react";
import { Upload, Download, Loader2, AlertTriangle, FileSpreadsheet } from "lucide-react";

import { useAuth } from "@/lib/auth";
import type { ImportKind, ImportRowError, ExistingBatch } from "@/lib/bulk-import";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * `@/lib/bulk-import` pulls in exceljs (a genuinely large parser/writer
 * library), so it's loaded on demand — the very first time an admin opens
 * this dialog or clicks "Download template" — rather than as part of the
 * Notices/Events/Opportunities/Clubs admin page bundle every admin
 * downloads just by visiting those pages. Vite code-splits the dynamic
 * import() into its own chunk automatically; the browser then caches it, so
 * this only costs a real network fetch once per admin session.
 */
function loadBulkImport() {
  return import("@/lib/bulk-import");
}

type Step = "upload" | "preview" | "importing" | "done";

const NOUN_PLURAL: Record<ImportKind, string> = {
  notices: "notices",
  events: "events",
  opportunities: "opportunities",
  clubs: "clubs",
};

const STATUS_WORD: Record<ImportKind, string> = {
  notices: "pending",
  events: "draft",
  opportunities: "draft",
  clubs: "draft",
};

interface BulkImportDialogProps {
  kind: ImportKind;
  /** Existing clubs, for resolving the "Club" column on the Notices/Events templates. Pass [] for kinds without a Club column. */
  clubs?: { id: string; name: string }[];
  /** Called after a successful import so the caller can refresh() its list — the new rows then show up immediately, same as any other content. */
  onImported: () => void;
}

export function BulkImportDialog({ kind, clubs = [], onImported }: BulkImportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [validRows, setValidRows] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<ImportRowError[]>([]);
  const [duplicateBatch, setDuplicateBatch] = useState<ExistingBatch | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFileName("");
    setFileHash("");
    setTotalRows(0);
    setValidRows([]);
    setErrors([]);
    setDuplicateBatch(null);
    setConfirmDuplicate(false);
    setParsing(false);
    setParseError(null);
    setProgress({ done: 0, total: 0 });
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setParsing(true);
    try {
      const mod = await loadBulkImport();
      const rawRows = await mod.parseWorkbook(file);
      const hash = await mod.hashFile(file);
      const parsed = mod.parseAndValidate(kind, rawRows, clubs, user?.id ?? "");
      const existing = await mod.findExistingBatch(kind, hash);
      setFileName(file.name);
      setFileHash(hash);
      setTotalRows(parsed.totalRows);
      setValidRows(parsed.validRows);
      setErrors(parsed.errors);
      setDuplicateBatch(existing);
      setConfirmDuplicate(false);
      setStep("preview");
    } catch (err) {
      setParseError(
        err instanceof Error
          ? err.message
          : "Couldn't read that file — make sure it's a .xlsx file.",
      );
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (!user || validRows.length === 0) return;
    setStep("importing");
    setProgress({ done: 0, total: validRows.length });
    try {
      const mod = await loadBulkImport();
      const batchId = await mod.createImportBatch(
        kind,
        fileName,
        fileHash,
        { total: totalRows, valid: validRows.length, errors: errors.length },
        user.id,
      );
      const { insertedCount, failures } = await mod.insertRows(
        kind,
        batchId,
        validRows,
        (done, total) => setProgress({ done, total }),
      );
      setResult({ inserted: insertedCount, failed: failures.length });
      setStep("done");
      onImported();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Import failed.");
      setStep("preview");
    }
  };

  const canImport = validRows.length > 0 && (!duplicateBatch || confirmDuplicate);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (step === "importing") return;
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-input bg-background px-4 text-sm font-bold transition hover:bg-accent active:scale-[0.98]"
        >
          <Upload className="size-4" aria-hidden="true" />
          Bulk import
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk import {NOUN_PLURAL[kind]}</DialogTitle>
          <DialogDescription>
            {step === "done"
              ? "Import complete."
              : `Upload an Excel file to create many ${NOUN_PLURAL[kind]} at once, as ${STATUS_WORD[kind]} records you review before they go live.`}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void loadBulkImport().then((mod) => mod.downloadTemplate(kind))}
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-4 text-sm font-bold transition hover:bg-accent"
            >
              <Download className="size-4" aria-hidden="true" />
              Download {NOUN_PLURAL[kind]} template
            </button>

            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input px-4 text-center text-sm text-muted-foreground transition hover:bg-accent/50">
              {parsing ? (
                <Loader2 className="size-6 animate-spin" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="size-6" aria-hidden="true" />
              )}
              <span className="font-semibold text-foreground">
                {parsing ? "Reading file…" : "Click to choose a filled-in .xlsx file"}
              </span>
              <span>Rows are imported as {STATUS_WORD[kind]} — nothing goes live yet.</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                disabled={parsing}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>

            {parseError ? (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {parseError}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === "preview" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 rounded-xl border border-input bg-accent/40 px-4 py-3 text-sm font-semibold">
              <span>
                Found: <span className="text-foreground">{totalRows}</span>
              </span>
              <span className="text-green-700">Valid: {validRows.length}</span>
              <span className={errors.length > 0 ? "text-destructive" : "text-muted-foreground"}>
                Errors: {errors.length}
              </span>
            </div>

            {duplicateBatch ? (
              <div className="space-y-2 rounded-xl border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30">
                <p className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  This exact file was already imported on{" "}
                  {new Date(duplicateBatch.createdAt).toLocaleDateString()} (
                  {duplicateBatch.totalRows} rows). Importing it again will create duplicate{" "}
                  {NOUN_PLURAL[kind]}.
                </p>
                <label className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <input
                    type="checkbox"
                    checked={confirmDuplicate}
                    onChange={(e) => setConfirmDuplicate(e.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  Import anyway
                </label>
              </div>
            ) : null}

            {errors.length > 0 ? (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-input">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-accent">
                    <tr>
                      <th className="px-3 py-2 font-bold">Row</th>
                      <th className="px-3 py-2 font-bold">Field</th>
                      <th className="px-3 py-2 font-bold">Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.slice(0, 100).map((err, i) => (
                      <tr key={`${err.row}-${err.field}-${i}`} className="border-t border-input">
                        <td className="px-3 py-1.5 font-semibold">{err.row}</td>
                        <td className="px-3 py-1.5">{err.field}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{err.problem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {errors.length > 100 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    +{errors.length - 100} more error{errors.length - 100 === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {parseError ? (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {parseError}
              </p>
            ) : null}

            <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-10 items-center rounded-xl border border-input bg-background px-4 text-sm font-bold transition hover:bg-accent"
              >
                Choose a different file
              </button>
              <button
                type="button"
                onClick={() => void runImport()}
                disabled={!canImport}
                className="inline-flex min-h-10 items-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60"
              >
                Import {validRows.length} record{validRows.length === 1 ? "" : "s"}
              </button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "importing" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-sm font-semibold text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            Importing {progress.done} / {progress.total}…
          </div>
        ) : null}

        {step === "done" && result ? (
          <div className="space-y-4">
            <p className="text-sm">
              Imported <span className="font-bold text-foreground">{result.inserted}</span> of{" "}
              {validRows.length} valid record{validRows.length === 1 ? "" : "s"}
              {result.failed > 0 ? ` — ${result.failed} couldn't be saved.` : "."} They're listed
              below as {STATUS_WORD[kind]} — click any of them to review, add images, and publish,
              exactly like any other {kind === "notices" ? "notice" : "item"}.
            </p>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 items-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90"
              >
                Done
              </button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
