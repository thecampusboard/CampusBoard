import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Megaphone, CalendarPlus, Briefcase, Paperclip, Pencil, ExternalLink } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useContent, slugify } from "@/lib/content";
import { supabase } from "@/lib/supabase";
import { usePageMeta } from "@/lib/seo";
import { NOTICE_CATEGORIES, OPPORTUNITY_TYPES, formatDate, publicClubs } from "@/lib/data";
import { isValidHttpUrl } from "@/lib/utils";
import type { Notice, CampusEvent, Opportunity } from "@/lib/data";
import { NoticeStatusBadge } from "@/components/notice-status-badge";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { uploadNoticeFile, noticeFileTypeFor } from "@/lib/notice-files";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const fieldClass =
  "min-h-11 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary";

/** "Jordan Lee" -> "JL", "Admin" -> "AD". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

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
    return (
      <img
        src={url}
        alt=""
        className="mt-2 h-24 w-auto rounded-lg border border-border object-cover"
      />
    );
  }
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
      {file.name} — no preview available for this file type.
    </p>
  );
}

/** Lets the owner of a pending/rejected notice edit its content and resubmit it — the only case where a non-admin can update a notice row (see notices_student_resubmit in 009_notice_resubmit_and_listing_rejection_reason.sql). Always lands back at 'pending' for a fresh review. */
function ResubmitNoticeDialog({
  notice,
  clubs,
}: {
  notice: Notice;
  clubs: { id: string; name: string }[];
}) {
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
        filePath = await uploadNoticeFile(user.id, notice.id, file);
      }
      await resubmitNotice(notice.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        department: department.trim(),
        ...(externalUrl.trim() ? { externalUrl: externalUrl.trim() } : {}),
        ...(clubId ? { clubId } : {}),
        ...(file ? { fileType: noticeFileTypeFor(file), filePath: filePath! } : {}),
      });
      setOpen(false);
    } catch (err) {
      if (filePath)
        supabase.storage
          .from("notice-files")
          .remove([filePath])
          .catch(() => {});
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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            aria-label="Title"
            className={fieldClass}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            aria-label="Description"
            rows={3}
            className={fieldClass}
            required
          />
          <select
            aria-label="Notice category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Notice["category"])}
            className={fieldClass}
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
            aria-label="Department"
            className={fieldClass}
            required
          />
          <select
            aria-label="Related club"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Not related to a club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div>
            <label className="text-xs font-bold text-foreground/80">
              External link <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="mt-1 flex min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-blue">
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…"
                aria-label="External link"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-accent">
            <Paperclip className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {file?.name ??
                (notice.filePath
                  ? "Replace attached file (optional)"
                  : "Attach a file (optional, PDF or image, up to 10 MB)")}
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
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Resubmitting…" : "Resubmit for review"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Lets the owner of a pending/rejected event edit its content and resubmit it — mirrors ResubmitNoticeDialog. Always lands back at 'pending' for a fresh review. */
function ResubmitEventDialog({
  event,
  clubs,
}: {
  event: CampusEvent;
  clubs: { id: string; name: string }[];
}) {
  const { resubmitEvent } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [organizer, setOrganizer] = useState(event.organizer);
  const [clubId, setClubId] = useState(event.clubId ?? "");
  const [date, setDate] = useState(event.date);
  const [venue, setVenue] = useState(event.venue);
  const [description, setDescription] = useState(event.description);
  const [eligibility, setEligibility] = useState(event.eligibility);
  const [registrationUrl, setRegistrationUrl] = useState(
    event.registrationUrl === "#" ? "" : event.registrationUrl,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() || !organizer.trim() || !date || !venue.trim() || !description.trim()) {
      setError("Fill in title, organizer, date, venue and description.");
      return;
    }
    if (registrationUrl.trim() && !isValidHttpUrl(registrationUrl.trim())) {
      setError("Registration link must be a valid http:// or https:// link.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resubmitEvent(event.id, {
        title: title.trim(),
        organizer: organizer.trim(),
        ...(clubId ? { clubId } : {}),
        date,
        venue: venue.trim(),
        description: description.trim(),
        eligibility: eligibility.trim(),
        ...(registrationUrl.trim() ? { registrationUrl: registrationUrl.trim() } : {}),
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resubmit the event.");
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
          <DialogTitle>Edit & resubmit event</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            aria-label="Event title"
            className={fieldClass}
            required
          />
          <input
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            placeholder="Organizer"
            aria-label="Organizer"
            className={fieldClass}
            required
          />
          <select
            aria-label="Related club"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Not related to a club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
            required
          />
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Venue"
            aria-label="Venue"
            className={fieldClass}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            aria-label="Description"
            rows={3}
            className={fieldClass}
            required
          />
          <input
            value={eligibility}
            onChange={(e) => setEligibility(e.target.value)}
            placeholder="Eligibility (e.g. Open to all students)"
            aria-label="Eligibility"
            className={fieldClass}
          />
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="url"
              value={registrationUrl}
              onChange={(e) => setRegistrationUrl(e.target.value)}
              placeholder="Registration link (optional)"
              aria-label="Registration link"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {error ? (
            <p role="alert" className="text-xs font-semibold text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Resubmitting…" : "Resubmit for review"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Lets the owner of a pending/rejected opportunity edit its content and resubmit it — mirrors ResubmitNoticeDialog. Always lands back at 'pending' for a fresh review. */
function ResubmitOpportunityDialog({ opportunity }: { opportunity: Opportunity }) {
  const { resubmitOpportunity } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(opportunity.title);
  const [organization, setOrganization] = useState(opportunity.organization);
  const [position, setPosition] = useState(opportunity.position);
  const [type, setType] = useState<Opportunity["type"]>(opportunity.type);
  const [location, setLocation] = useState(opportunity.location);
  const [deadline, setDeadline] = useState(opportunity.deadline);
  const [description, setDescription] = useState(opportunity.description);
  const [applyUrl, setApplyUrl] = useState(
    opportunity.applyUrl === "#" ? "" : opportunity.applyUrl,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (
      !title.trim() ||
      !organization.trim() ||
      !position.trim() ||
      !location.trim() ||
      !deadline ||
      !description.trim()
    ) {
      setError("Fill in title, organization, position, location, deadline and description.");
      return;
    }
    if (applyUrl.trim() && !isValidHttpUrl(applyUrl.trim())) {
      setError("Application link must be a valid http:// or https:// link.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resubmitOpportunity(opportunity.id, {
        title: title.trim(),
        organization: organization.trim(),
        position: position.trim(),
        type,
        location: location.trim(),
        deadline,
        description: description.trim(),
        ...(applyUrl.trim() ? { applyUrl: applyUrl.trim() } : {}),
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resubmit the opportunity.");
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
          <DialogTitle>Edit & resubmit opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Opportunity title"
            aria-label="Opportunity title"
            className={fieldClass}
            required
          />
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Organization"
            aria-label="Organization"
            className={fieldClass}
            required
          />
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Position / role"
            aria-label="Position / role"
            className={fieldClass}
            required
          />
          <select
            aria-label="Opportunity type"
            value={type}
            onChange={(e) => setType(e.target.value as Opportunity["type"])}
            className={fieldClass}
          >
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. On campus, Remote)"
            aria-label="Location"
            className={fieldClass}
            required
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={fieldClass}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            aria-label="Description"
            rows={3}
            className={fieldClass}
            required
          />
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="url"
              value={applyUrl}
              onChange={(e) => setApplyUrl(e.target.value)}
              placeholder="Application link (optional)"
              aria-label="Application link"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {error ? (
            <p role="alert" className="text-xs font-semibold text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
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
    "Your submitted notices, events and opportunities, and forms to submit new ones for review.",
    { noindex: true },
  );

  const { user, ready } = useAuth();
  const {
    notices,
    events,
    opportunities,
    clubs: allClubs,
    submitNotice,
    submitEvent,
    submitOpportunity,
  } = useContent();
  // Students shouldn't be able to tag their own submission with a club
  // that's still an unreviewed bulk-import draft — see publicClubs().
  const clubs = publicClubs(allClubs);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Notice["category"]>(NOTICE_CATEGORIES[0] ?? "General");
  const [department, setDepartment] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [clubId, setClubId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Submit an Event ------------------------------------------------------
  const [evTitle, setEvTitle] = useState("");
  const [evOrganizer, setEvOrganizer] = useState("");
  const [evClubId, setEvClubId] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evVenue, setEvVenue] = useState("");
  const [evDescription, setEvDescription] = useState("");
  const [evEligibility, setEvEligibility] = useState("Open to all students");
  const [evRegistrationUrl, setEvRegistrationUrl] = useState("");
  const [evSubmitting, setEvSubmitting] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);
  const [evSuccess, setEvSuccess] = useState(false);

  // Submit an Opportunity --------------------------------------------------
  const [opTitle, setOpTitle] = useState("");
  const [opOrganization, setOpOrganization] = useState("");
  const [opPosition, setOpPosition] = useState("");
  const [opType, setOpType] = useState<Opportunity["type"]>(OPPORTUNITY_TYPES[0] ?? "Internship");
  const [opLocation, setOpLocation] = useState("On campus");
  const [opDeadline, setOpDeadline] = useState("");
  const [opDescription, setOpDescription] = useState("");
  const [opApplyUrl, setOpApplyUrl] = useState("");
  const [opSubmitting, setOpSubmitting] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [opSuccess, setOpSuccess] = useState(false);

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

  const myNotices = notices.filter((n) => n.createdBy === user.id);
  const myEvents = events
    .filter((e) => e.createdBy === user.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const myOpportunities = opportunities
    .filter((o) => o.createdBy === user.id)
    .sort((a, b) => b.deadline.localeCompare(a.deadline));

  const handleSubmitEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (
      !evTitle.trim() ||
      !evOrganizer.trim() ||
      !evDate ||
      !evVenue.trim() ||
      !evDescription.trim()
    ) {
      setEvError("Fill in title, organizer, date, venue and description.");
      return;
    }
    if (evRegistrationUrl.trim() && !isValidHttpUrl(evRegistrationUrl.trim())) {
      setEvError("Registration link must be a valid http:// or https:// link.");
      return;
    }
    setEvError(null);
    setEvSuccess(false);
    setEvSubmitting(true);
    try {
      await submitEvent({
        id: `${slugify(evTitle)}-${Date.now().toString(36)}`,
        title: evTitle.trim(),
        organizer: evOrganizer.trim(),
        ...(evClubId ? { clubId: evClubId } : {}),
        date: evDate,
        venue: evVenue.trim(),
        description: evDescription.trim(),
        eligibility: evEligibility.trim() || "Open to all students",
        registrationUrl: evRegistrationUrl.trim() || "#",
        accent: "sky",
      });
      formEl.reset();
      setEvTitle("");
      setEvOrganizer("");
      setEvClubId("");
      setEvDate("");
      setEvVenue("");
      setEvDescription("");
      setEvEligibility("Open to all students");
      setEvRegistrationUrl("");
      setEvSuccess(true);
    } catch (err) {
      setEvError(err instanceof Error ? err.message : "Could not submit the event.");
    } finally {
      setEvSubmitting(false);
    }
  };

  const handleSubmitOpportunity = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (
      !opTitle.trim() ||
      !opOrganization.trim() ||
      !opPosition.trim() ||
      !opLocation.trim() ||
      !opDeadline ||
      !opDescription.trim()
    ) {
      setOpError("Fill in title, organization, position, location, deadline and description.");
      return;
    }
    if (opApplyUrl.trim() && !isValidHttpUrl(opApplyUrl.trim())) {
      setOpError("Application link must be a valid http:// or https:// link.");
      return;
    }
    setOpError(null);
    setOpSuccess(false);
    setOpSubmitting(true);
    try {
      await submitOpportunity({
        id: `${slugify(opTitle)}-${Date.now().toString(36)}`,
        title: opTitle.trim(),
        organization: opOrganization.trim(),
        position: opPosition.trim(),
        type: opType,
        location: opLocation.trim(),
        eligibility: "Open to all students",
        yearsBranches: "All years",
        description: opDescription.trim(),
        skills: [],
        deadline: opDeadline,
        applyUrl: opApplyUrl.trim() || "#",
        accent: "orange",
      });
      formEl.reset();
      setOpTitle("");
      setOpOrganization("");
      setOpPosition("");
      setOpType(OPPORTUNITY_TYPES[0] ?? "Internship");
      setOpLocation("On campus");
      setOpDeadline("");
      setOpDescription("");
      setOpApplyUrl("");
      setOpSuccess(true);
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Could not submit the opportunity.");
    } finally {
      setOpSubmitting(false);
    }
  };

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
        years: [],
        semesters: [],
        date: new Date().toISOString().slice(0, 10),
        fileType: file ? noticeFileTypeFor(file) : "Text",
        ...(externalUrl.trim() ? { externalUrl: externalUrl.trim() } : {}),
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
    <div className="mx-auto min-w-0 max-w-full space-y-6">
      {/* Profile ------------------------------------------------------------ */}
      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">Dashboard</p>
            <h1 className="break-words pt-1 text-2xl font-display font-extrabold tracking-tight sm:text-3xl text-foreground">
              {user.name}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        {/* My Notice Submissions ------------------------------------------ */}
        <Card className="min-w-0 p-6 sm:p-8 border-border/70 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Megaphone className="size-5 shrink-0 text-primary" aria-hidden="true" />
            My Notice Submissions
          </h2>
          {myNotices.length === 0 ? (
            <p className="pt-3 text-sm text-muted-foreground">
              You haven't submitted any notices yet — use the form below.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myNotices.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-border"
                >
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
        </Card>

        {/* My Event Submissions -------------------------------------------- */}
        <Card className="min-w-0 p-6 sm:p-8 border-border/70 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <CalendarPlus className="size-5 shrink-0 text-primary" aria-hidden="true" />
            My Event Submissions
          </h2>
          {myEvents.length === 0 ? (
            <p className="pt-3 text-sm text-muted-foreground">
              You haven't submitted any events yet — use the form below.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myEvents.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-border"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-bold">{e.title}</span>
                    <SubmissionStatusBadge status={e.status} />
                  </div>
                  <p className="pt-1 text-xs text-muted-foreground">
                    {formatDate(e.date)} · {e.venue}
                  </p>
                  {e.status === "rejected" && e.rejectionReason ? (
                    <p className="pt-2 text-xs font-semibold text-destructive">
                      Reason: {e.rejectionReason}
                    </p>
                  ) : null}
                  {e.status === "pending" || e.status === "rejected" ? (
                    <ResubmitEventDialog event={e} clubs={clubs} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* My Opportunity Submissions ---------------------------------------- */}
        <Card className="min-w-0 p-6 sm:p-8 border-border/70 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Briefcase className="size-5 shrink-0 text-primary" aria-hidden="true" />
            My Opportunity Submissions
          </h2>
          {myOpportunities.length === 0 ? (
            <p className="pt-3 text-sm text-muted-foreground">
              You haven't submitted any opportunities yet — use the form below.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myOpportunities.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-border"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-bold">{o.title}</span>
                    <SubmissionStatusBadge status={o.status} />
                  </div>
                  <p className="pt-1 text-xs text-muted-foreground">
                    {o.organization} · {formatDate(o.deadline)}
                  </p>
                  {o.status === "rejected" && o.rejectionReason ? (
                    <p className="pt-2 text-xs font-semibold text-destructive">
                      Reason: {o.rejectionReason}
                    </p>
                  ) : null}
                  {o.status === "pending" || o.status === "rejected" ? (
                    <ResubmitOpportunityDialog opportunity={o} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Submit a Notice ---------------------------------------------------- */}
      <Card className="min-w-0 p-6 sm:p-8 border-border/70 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">Submit a Notice</h2>
        <p className="pt-1 text-sm text-muted-foreground">
          Your notice goes to Admin for review first — it only becomes public once approved.
        </p>
        <form
          className="mt-4 grid w-full min-w-0 gap-3 sm:grid-cols-2"
          onSubmit={handleSubmitNotice}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            aria-label="Title"
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            aria-label="Description"
            rows={3}
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          />
          <select
            aria-label="Notice category"
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
            aria-label="Department"
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-foreground/80">
              External link <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="mt-1 flex min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-colors">
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…"
                aria-label="Link"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <select
            aria-label="Related club"
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
            <p
              role="status"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 sm:col-span-2"
            >
              Submitted — you'll see it above once Admin reviews it.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60 sm:col-span-2"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </Card>

      {/* Submit an Event ------------------------------------------------------ */}
      <Card className="min-w-0 p-6 sm:p-8 border-border/70 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <CalendarPlus className="size-5 shrink-0 text-primary" aria-hidden="true" />
          Submit an Event
        </h2>
        <p className="pt-1 text-sm text-muted-foreground">
          Your event goes to Admin for review first — it only becomes public once approved.
        </p>
        <form
          className="mt-4 grid w-full min-w-0 gap-3 sm:grid-cols-2"
          onSubmit={handleSubmitEvent}
        >
          <input
            value={evTitle}
            onChange={(e) => setEvTitle(e.target.value)}
            placeholder="Event title"
            aria-label="Event title"
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          />
          <input
            value={evOrganizer}
            onChange={(e) => setEvOrganizer(e.target.value)}
            placeholder="Organizer"
            aria-label="Organizer"
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <select
            aria-label="Related club"
            value={evClubId}
            onChange={(e) => setEvClubId(e.target.value)}
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          >
            <option value="">Not related to a club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={evDate}
            onChange={(e) => setEvDate(e.target.value)}
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <input
            value={evVenue}
            onChange={(e) => setEvVenue(e.target.value)}
            placeholder="Venue"
            aria-label="Venue"
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <textarea
            value={evDescription}
            onChange={(e) => setEvDescription(e.target.value)}
            placeholder="Description"
            aria-label="Description"
            rows={3}
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          />
          <input
            value={evEligibility}
            onChange={(e) => setEvEligibility(e.target.value)}
            placeholder="Eligibility (e.g. Open to all students)"
            aria-label="Eligibility"
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <div>
            <label className="text-xs font-bold text-foreground/80">
              Registration link{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="mt-1 flex min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-colors">
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="url"
                value={evRegistrationUrl}
                onChange={(e) => setEvRegistrationUrl(e.target.value)}
                placeholder="https://…"
                aria-label="Link"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          {evError ? (
            <p role="alert" className="text-xs font-semibold text-destructive sm:col-span-2">
              {evError}
            </p>
          ) : null}
          {evSuccess ? (
            <p
              role="status"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 sm:col-span-2"
            >
              Submitted — you'll see it above once Admin reviews it.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={evSubmitting}
            className="min-h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60 sm:col-span-2"
          >
            {evSubmitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </Card>

      {/* Submit an Opportunity -------------------------------------------------- */}
      <Card className="min-w-0 p-6 sm:p-8 border-border/70 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Briefcase className="size-5 shrink-0 text-primary" aria-hidden="true" />
          Submit an Opportunity
        </h2>
        <p className="pt-1 text-sm text-muted-foreground">
          Your opportunity goes to Admin for review first — it only becomes public once approved.
        </p>
        <form
          className="mt-4 grid w-full min-w-0 gap-3 sm:grid-cols-2"
          onSubmit={handleSubmitOpportunity}
        >
          <input
            value={opTitle}
            onChange={(e) => setOpTitle(e.target.value)}
            placeholder="Opportunity title"
            aria-label="Opportunity title"
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          />
          <input
            value={opOrganization}
            onChange={(e) => setOpOrganization(e.target.value)}
            placeholder="Organization"
            aria-label="Organization"
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <input
            value={opPosition}
            onChange={(e) => setOpPosition(e.target.value)}
            placeholder="Position / role"
            aria-label="Position / role"
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <select
            aria-label="Opportunity type"
            value={opType}
            onChange={(e) => setOpType(e.target.value as Opportunity["type"])}
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          >
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={opLocation}
            onChange={(e) => setOpLocation(e.target.value)}
            placeholder="Location (e.g. On campus, Remote)"
            aria-label="Location"
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <input
            type="date"
            value={opDeadline}
            onChange={(e) => setOpDeadline(e.target.value)}
            className={`${fieldClass} box-border min-w-0 max-w-full`}
          />
          <textarea
            value={opDescription}
            onChange={(e) => setOpDescription(e.target.value)}
            placeholder="Description"
            aria-label="Description"
            rows={3}
            className={`${fieldClass} box-border min-w-0 max-w-full sm:col-span-2`}
          />
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-foreground/80">
              Application link <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="mt-1 flex min-w-0 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-colors">
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="url"
                value={opApplyUrl}
                onChange={(e) => setOpApplyUrl(e.target.value)}
                placeholder="https://…"
                aria-label="Link"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          {opError ? (
            <p role="alert" className="text-xs font-semibold text-destructive sm:col-span-2">
              {opError}
            </p>
          ) : null}
          {opSuccess ? (
            <p
              role="status"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 sm:col-span-2"
            >
              Submitted — you'll see it above once Admin reviews it.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={opSubmitting}
            className="min-h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60 sm:col-span-2"
          >
            {opSubmitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </Card>
    </div>
  );
}
