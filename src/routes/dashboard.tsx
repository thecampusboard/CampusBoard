import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { ShoppingBag, Megaphone, Paperclip, Pencil, ExternalLink, CreditCard, Plus } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useContent, slugify } from "@/lib/content";
import { supabase } from "@/lib/supabase";
import { usePageMeta } from "@/lib/seo";
import {
  NOTICE_CATEGORIES,
  formatDate,
  formatPrice,
  isListingActive,
  listingExpiryDate,
} from "@/lib/data";
import { isValidHttpUrl } from "@/lib/utils";
import type { Notice, ListingStatus } from "@/lib/data";
import { NoticeStatusBadge } from "@/components/notice-status-badge";
import { uploadNoticeFile, noticeFileTypeFor } from "@/lib/notice-files";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const fieldClass =
  "min-h-11 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-blue";


/** Thumbnail preview for a just-picked file, before it's ever uploaded — an object URL, revoked on unmount/change. */
function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith("image/")) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (url) {
    return <img src={url} alt="" className="mt-2 h-24 w-auto rounded-lg border border-border object-cover" />;
  }
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
      {file.name} — no preview available for this file type.
    </p>
  );
}

const LISTING_STATUS_INFO: Record<ListingStatus, { label: string; tone: string }> = {
  payment_pending: { label: "Awaiting your ₹20 payment", tone: "bg-yellow/30 text-navy" },
  payment_submitted: {
    label: "Payment screenshot received",
    tone: "bg-yellow/30 text-navy",
  },
  pending_approval: { label: "Awaiting Admin approval", tone: "bg-yellow/30 text-navy" },
  approved: { label: "Live on Buy & Sell", tone: "bg-green/20 text-navy" },
  rejected: { label: "Rejected", tone: "bg-destructive/10 text-destructive" },
  expired: { label: "Expired", tone: "bg-secondary text-muted-foreground" },
};

/** Lets the owner of a pending/rejected notice edit its content and resubmit it — the only case where a non-admin can update a notice row (see notices_student_resubmit in 009_notice_resubmit_and_listing_rejection_reason.sql). Always lands back at 'pending' for a fresh review. */
function ResubmitNoticeDialog({ notice, clubs }: { notice: Notice; clubs: { id: string; name: string }[] }) {
  const { user } = useAuth();
  const { resubmitNotice } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(notice.title);
  const [description, setDescription] = useState(notice.description);
  const [category, setCategory] = useState<Notice["category"]>(notice.category);
  const [department, setDepartment] = useState(notice.department);
  const [externalUrl, setExternalUrl] = useState(notice.externalUrl ?? "");
  const [clubId, setClubId] = useState(notice.clubId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !user) return;
    if (!title.trim() || !description.trim() || !department.trim()) {
      setError("Fill in title, description and department.");
      return;
    }
    if (externalUrl.trim() && !isValidHttpUrl(externalUrl.trim())) {
      setError("External URL must be a valid http:// or https:// link.");
      return;
    }
    if (file) {
      const okType = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]).has(file.type);
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
        filePath = await uploadNoticeFile(user.id, notice.id, file);
      }
      await resubmitNotice(notice.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        department: department.trim(),
        externalUrl: externalUrl.trim() || undefined,
        clubId: clubId || undefined,
        ...(file ? { fileType: noticeFileTypeFor(file), filePath } : {}),
      });
      setOpen(false);
    } catch (err) {
      if (filePath) supabase.storage.from("notice-files").remove([filePath]).catch(() => {});
      setError(err instanceof Error ? err.message : "Couldn't resubmit the notice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold hover:bg-accent"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Edit & Resubmit
        </button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit & resubmit notice</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={fieldClass} required />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className={fieldClass}
            required
          />
          <select value={category} onChange={(e) => setCategory(e.target.value as Notice["category"])} className={fieldClass}>
            {NOTICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" className={fieldClass} required />
          <select value={clubId} onChange={(e) => setClubId(e.target.value)} className={fieldClass}>
            <option value="">Not related to a club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div>
            <label className="text-xs font-bold text-foreground/80">External link <span className="font-normal text-muted-foreground">(optional)</span></label>
            <div className="mt-1 flex min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-blue">
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-accent">
            <Paperclip className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {file?.name ?? (notice.filePath ? "Replace attached file (optional)" : "Attach a file (optional, PDF or image, up to 10 MB)")}
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file ? <FilePreview file={file} /> : null}
          {error ? (
            <p role="alert" className="text-xs font-semibold text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60"
            >
              {submitting ? "Resubmitting…" : "Resubmit for review"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  usePageMeta(
    "My Dashboard — CampusBoard",
    "Your Buy & Sell listings, notice submissions, and a form to submit a new notice for review.",
  );

  const { user, ready } = useAuth();
  const { listings, notices, clubs, submitNotice } = useContent();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Notice["category"]>(NOTICE_CATEGORIES[0]);
  const [department, setDepartment] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [clubId, setClubId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (ready && !user) {
    return <Navigate to="/login" replace />;
  }
  if (!user) {
    return (
      <div className="bento p-8">
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    );
  }

  const myListings = listings.filter((l) => l.ownerId === user.id);
  const myNotices = notices.filter((n) => n.createdBy === user.id);

  const handleSubmitNotice = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (!title.trim() || !description.trim() || !department.trim()) {
      setError("Fill in title, description and department.");
      return;
    }
    if (externalUrl.trim() && !isValidHttpUrl(externalUrl.trim())) {
      setError("External URL must be a valid http:// or https:// link.");
      return;
    }
    if (file) {
      const okType = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]).has(file.type);
      if (!okType) {
        setError("Attachments must be a PDF or an image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Attachment must be 10 MB or smaller.");
        return;
      }
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    const noticeId = `${slugify(title)}-${Date.now().toString(36)}`;
    let filePath: string | undefined;
    try {
      if (file) {
        filePath = await uploadNoticeFile(user.id, noticeId, file);
      }
      await submitNotice({
        id: noticeId,
        title: title.trim(),
        description: description.trim(),
        category,
        department: department.trim(),
        externalUrl: externalUrl.trim() || undefined,
        years: [],
        semesters: [],
        date: new Date().toISOString().slice(0, 10),
        fileType: file ? noticeFileTypeFor(file) : "Text",
        ...(clubId ? { clubId } : {}),
        ...(filePath ? { filePath } : {}),
      });
      formEl.reset();
      setTitle("");
      setDescription("");
      setDepartment("");
      setExternalUrl("");
      setClubId("");
      setFile(null);
      setSuccess(true);
    } catch (err) {
      // Don't leave an orphaned upload behind if the notice row itself failed.
      if (filePath) {
        supabase.storage
          .from("notice-files")
          .remove([filePath])
          .catch(() => {});
      }
      setError(err instanceof Error ? err.message : "Could not submit the notice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-4 overflow-x-clip sm:space-y-5">
      <header className="bento p-4 sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          Dashboard
        </p>
        <h1 className="break-words pt-2 text-2xl font-extrabold sm:text-4xl">
          Hi, {user.name.split(" ")[0]}
        </h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Your Buy & Sell listings and notice submissions, in one place.
        </p>
      </header>

      <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2">
        {/* My Buy & Sell -------------------------------------------------- */}
        <section className="bento min-w-0 p-4 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <ShoppingBag className="size-5 shrink-0" aria-hidden="true" />
              My Buy & Sell
            </h2>
            <Link
              to="/buy-sell/new"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-navy px-3.5 text-xs font-bold text-navy-foreground transition-colors hover:bg-navy/90"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add listing
            </Link>
          </div>
          {myListings.length === 0 ? (
            <p className="pt-3 text-sm text-muted-foreground">
              You haven't posted anything yet.{" "}
              <Link to="/buy-sell/new" className="font-semibold underline">
                Sell something
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myListings.map((l) => {
                const info = LISTING_STATUS_INFO[l.status];
                const active = isListingActive(l);
                const expiry = listingExpiryDate(l);
                return (
                  <li key={l.id} className="rounded-xl border border-border p-4">
                    <Link to={`/buy-sell/${l.id}`} className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 break-words text-sm font-bold underline">{l.title}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${info.tone}`}
                      >
                        {info.label}
                      </span>
                    </Link>
                    <p className="pt-1 text-sm font-extrabold text-navy">
                      {formatPrice(l.price)}
                    </p>
                    {expiry ? (
                      <p className="pt-1 text-xs text-muted-foreground">
                        {active ? "Visible until" : "Was visible until"} {formatDate(expiry)}
                      </p>
                    ) : null}
                    {l.status === "rejected" && l.rejectionReason ? (
                      <p className="pt-2 break-words text-xs font-semibold text-destructive">
                        Reason: {l.rejectionReason}
                      </p>
                    ) : null}
                    {l.status === "payment_pending" ? (
                      <div className="pt-3">
                        <Link
                          to={`/buy-sell/new?listingId=${encodeURIComponent(l.id)}`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-yellow/20 px-3 text-xs font-bold text-navy transition-colors hover:bg-yellow/30"
                        >
                          <CreditCard className="size-3.5" aria-hidden="true" />
                          Pay now
                        </Link>
                      </div>
                    ) : l.status === "payment_submitted" ? (
                      <div className="pt-3">
                        <Link
                          to={`/buy-sell/new?listingId=${encodeURIComponent(l.id)}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-bold hover:bg-accent"
                        >
                          Upload payment proof
                        </Link>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* My Notice Submissions ------------------------------------------ */}
        <section className="bento min-w-0 p-4 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <Megaphone className="size-5 shrink-0" aria-hidden="true" />
            My Notice Submissions
          </h2>
          {myNotices.length === 0 ? (
            <p className="pt-3 text-sm text-muted-foreground">
              You haven't submitted any notices yet — use the form below.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myNotices.map((n) => (
                <li key={n.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-bold">{n.title}</span>
                    <NoticeStatusBadge status={n.status} />
                  </div>
                  <p className="pt-1 text-xs text-muted-foreground">
                    {n.category} · {n.department}
                  </p>
                  {n.status === "rejected" && n.rejectionReason ? (
                    <p className="pt-2 text-xs font-semibold text-destructive">
                      Reason: {n.rejectionReason}
                    </p>
                  ) : null}
                  {n.status === "pending" || n.status === "rejected" ? (
                    <ResubmitNoticeDialog notice={n} clubs={clubs} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Submit a Notice ---------------------------------------------------- */}
      <section className="bento min-w-0 p-4 sm:p-8">
        <h2 className="text-xl font-extrabold">Submit a Notice</h2>
        <p className="pt-1 text-sm text-muted-foreground">
          Your notice goes to Admin for review first — it only becomes public once approved.
        </p>
        <form className="mt-4 grid w-full min-w-0 gap-3 sm:grid-cols-2" onSubmit={handleSubmitNotice}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Notice["category"])}
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          >
            {NOTICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department"
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-foreground/80">External link <span className="font-normal text-muted-foreground">(optional)</span></label>
            <div className="mt-1 flex min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-blue">
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <select
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          >
            <option value="">Not related to a club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="min-w-0 sm:col-span-2">
            <label className="flex min-h-11 min-w-0 max-w-full cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-dashed border-input bg-card px-3 text-sm font-semibold text-muted-foreground hover:bg-accent sm:px-4">
              <Paperclip className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate" title={file?.name ?? undefined}>
                {file?.name ?? "Attach a file (optional, PDF or image, up to 10 MB)"}
              </span>
              <input
                name="file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file ? <FilePreview file={file} /> : null}
          </div>
          {error ? (
            <p role="alert" className="text-xs font-semibold text-destructive sm:col-span-2">
              {error}
            </p>
          ) : null}
          {success ? (
            <p role="status" className="text-xs font-semibold text-navy sm:col-span-2">
              Submitted — you'll see it above once Admin reviews it.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 rounded-xl bg-navy text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60 sm:col-span-2"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </section>
    </div>
  );
}
