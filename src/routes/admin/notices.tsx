import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FormEvent } from "react";
import { Megaphone, Pencil, Plus, Trash2, Paperclip } from "lucide-react";

import { useContent, slugify } from "@/lib/content";
import { NOTICE_CATEGORIES, SEMESTERS, YEARS, formatDate } from "@/lib/data";
import { isValidHttpUrl } from "@/lib/utils";
import type { Notice } from "@/lib/data";
import { uploadNoticeFile, noticeFileTypeFor } from "@/lib/notice-files";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { BulkImportDialog } from "@/components/admin/bulk-import-dialog";
import { Field, fieldClass, UrlField } from "@/components/admin/form-field";
import { ConfirmDeleteDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/bento";
import { NoticeStatusBadge } from "@/components/notice-status-badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type NoticeDraft = Omit<
  Notice,
  "views" | "status" | "createdBy" | "reviewedAt" | "rejectionReason"
>;

function emptyDraft(): NoticeDraft {
  return {
    id: slugify("notice"),
    title: "",
    description: "",
    category: "General",
    department: "",
    years: [],
    semesters: [],
    date: new Date().toISOString().slice(0, 10),
    fileType: "Text",
  };
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function NoticeFormDialog({ notice, trigger }: { notice?: Notice; trigger: React.ReactNode }) {
  const { user } = useAuth();
  const { clubs, addNotice, updateNotice } = useContent();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NoticeDraft>(notice ?? emptyDraft());
  const [file, setFile] = useState<File | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!notice;

  const set = <K extends keyof NoticeDraft>(key: K, value: NoticeDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }) as NoticeDraft);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !user) return;
    if (!draft.title.trim() || !draft.description.trim() || !draft.department.trim()) {
      setError("Title, description and department are required.");
      return;
    }
    if (draft.externalUrl?.trim() && !isValidHttpUrl(draft.externalUrl.trim())) {
      setError("External URL must be a valid http:// or https:// link.");
      return;
    }
    if (file) {
      const okType = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]).has(
        file.type,
      );
      if (!okType) {
        setError("Attachments must be a PDF or an image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Attachment must be 10 MB or smaller.");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    let filePath: string | undefined;
    try {
      if (file) {
        filePath = await uploadNoticeFile(user.id, draft.id, file);
      }
      const payload: NoticeDraft = {
        ...draft,
        id: isEdit ? notice.id : `${slugify(draft.title)}-${Date.now().toString(36)}`,
        ...(draft.externalUrl ? { externalUrl: draft.externalUrl.trim() } : {}),
        ...(file
          ? { fileType: noticeFileTypeFor(file), filePath: filePath! }
          : removeExistingFile
            ? { fileType: "Text", fileLabel: "", filePath: "" }
            : {}),
      };
      if (isEdit) {
        await updateNotice(notice.id, payload);
        if ((file || removeExistingFile) && notice.filePath && notice.filePath !== filePath) {
          await supabase.storage
            .from("notice-files")
            .remove([notice.filePath])
            .catch(() => {});
        }
      } else {
        await addNotice(payload);
      }
      setOpen(false);
    } catch (err) {
      if (filePath)
        supabase.storage
          .from("notice-files")
          .remove([filePath])
          .catch(() => {});
      setError(err instanceof Error ? err.message : "Couldn't save the notice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(notice ?? emptyDraft());
          setFile(null);
          setRemoveExistingFile(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] max-w-2xl min-w-0 overflow-y-auto sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit notice" : "Create notice"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="w-full min-w-0 space-y-4">
          <Field label="Title" required>
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className={`${fieldClass} box-border min-w-0 max-w-full`}
              required
            />
          </Field>
          <Field label="Description" required>
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={`${fieldClass} box-border min-w-0 max-w-full`}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={draft.category}
                onChange={(e) => set("category", e.target.value as Notice["category"])}
                className={fieldClass}
              >
                {NOTICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department" required>
              <input
                value={draft.department}
                onChange={(e) => set("department", e.target.value)}
                className={fieldClass}
                required
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Club" hint="Optional — shows on the club's page too.">
              <select
                value={draft.clubId ?? ""}
                onChange={(e) => set("clubId", e.target.value || undefined)}
                className={fieldClass}
              >
                <option value="">None</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div>
            <p className="text-xs font-bold text-foreground/80">Applies to years</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {YEARS.map((y) => (
                <label
                  key={y}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  <input
                    type="checkbox"
                    checked={draft.years.includes(y)}
                    onChange={() => set("years", toggle(draft.years, y))}
                    className="size-3.5"
                  />
                  {y}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-foreground/80">Applies to semesters</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {SEMESTERS.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  <input
                    type="checkbox"
                    checked={draft.semesters.includes(s)}
                    onChange={() => set("semesters", toggle(draft.semesters, s))}
                    className="size-3.5"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <Field label="External link" hint="Optional — e.g. a Google Form or an external page.">
            <UrlField
              value={draft.externalUrl ?? ""}
              onChange={(e) => set("externalUrl", e.target.value || undefined)}
            />
          </Field>
          <Field label="Attachment" hint="Optional, PDF or image, up to 10 MB.">
            {isEdit && draft.filePath && !removeExistingFile && !file ? (
              <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/60 p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-xs font-bold">
                    <Paperclip className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{draft.fileLabel ?? "Current attachment"}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Choose a new file to replace it, or remove it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveExistingFile(true)}
                  className="min-h-9 rounded-lg border border-destructive/25 px-3 text-xs font-bold text-destructive hover:bg-destructive/5"
                >
                  Remove
                </button>
              </div>
            ) : null}
            {!removeExistingFile ? (
              <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-accent">
                <Paperclip className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">
                  {file?.name ?? (draft.filePath ? "Replace attached file" : "Choose file")}
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setRemoveExistingFile(false);
                  }}
                />
              </label>
            ) : (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <span className="text-xs font-semibold text-destructive">
                  Attachment will be removed on save.
                </span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingFile(false)}
                  className="text-xs font-bold underline"
                >
                  Undo
                </button>
              </div>
            )}
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={draft.featured ?? false}
              onChange={(e) => set("featured", e.target.checked)}
              className="size-4 rounded border-input"
            />
            Featured
          </label>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 items-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60"
            >
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Publish notice"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_FILTERS = ["all", "approved", "pending", "rejected"] as const;

export default function AdminNoticesPage() {
  const { notices, clubs, loading, error, refresh, remove } = useContent();
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus =
    (searchParams.get("status") as (typeof STATUS_FILTERS)[number] | null) ?? "all";
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>(
    STATUS_FILTERS.includes(initialStatus) ? initialStatus : "all",
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices
      .filter((n) => (status === "all" ? n.status !== "rejected" : n.status === status))
      .filter((n) => (q ? `${n.title} ${n.department}`.toLowerCase().includes(q) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [notices, search, status]);

  return (
    <div className="space-y-5">
      <div className="bento p-6">
        <h1 className="text-2xl font-extrabold">Notices</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Notices you publish directly go live immediately. Student submissions are reviewed under
          Approvals.
        </p>
      </div>

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search notices…"
        sortOptions={STATUS_FILTERS.map((s) => ({
          value: s,
          label: s === "all" ? "Active & pending" : s.charAt(0).toUpperCase() + s.slice(1),
        }))}
        sort={status}
        onSort={(v) => {
          const next = v as typeof status;
          setStatus(next);
          if (next === "rejected") setSearchParams({ status: "rejected" });
          else setSearchParams({});
        }}
        count={filtered.length}
        noun="notice"
        extra={
          <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">
            <BulkImportDialog kind="notices" clubs={clubs} onImported={refresh} />
            <NoticeFormDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 text-sm font-bold text-navy-foreground transition hover:bg-navy/90 active:scale-[0.98]"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New notice
                </button>
              }
            />
          </div>
        }
      />

      {loading && notices.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error && notices.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={notices.length === 0 ? "No notices yet" : "No notices match your filters"}
          hint={
            notices.length === 0 ? "Publish the first notice." : "Try a different search or status."
          }
        />
      ) : (
        <ul className="bento divide-y divide-border p-2">
          {filtered.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-3 p-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-orange/20 text-navy"
                aria-hidden="true"
              >
                <Megaphone className="size-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(n.date)} · {n.category} · {n.department}
                </p>
              </div>
              <NoticeStatusBadge status={n.status} />
              <span className="text-xs font-semibold text-muted-foreground">{n.views} views</span>
              <div className="flex shrink-0 gap-1.5">
                <NoticeFormDialog
                  notice={n}
                  trigger={
                    <button
                      type="button"
                      aria-label={`Edit ${n.title}`}
                      className="grid size-9 place-items-center rounded-lg border border-border hover:bg-accent"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  }
                />
                <ConfirmDeleteDialog
                  trigger={
                    <button
                      type="button"
                      aria-label={`Delete ${n.title}`}
                      className="grid size-9 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  }
                  title={`Delete "${n.title}"?`}
                  description="This notice will be permanently removed. This can't be undone."
                  onConfirm={() => remove("notices", n.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
