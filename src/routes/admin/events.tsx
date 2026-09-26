import { forwardRef, useMemo, useState } from "react";
import type { ButtonHTMLAttributes, FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Pencil, Plus, Trash2, Star } from "lucide-react";

import { useContent, slugify } from "@/lib/content";
import { cn, hasRealUrl } from "@/lib/utils";
import { ACCENTS, formatDate, formatEventTimeRange } from "@/lib/data";
import type { CampusEvent } from "@/lib/data";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { BulkImportDialog } from "@/components/admin/bulk-import-dialog";
import { DraftBadge } from "@/components/admin/draft-badge";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { Field, fieldClass, UrlField } from "@/components/admin/form-field";
import { ConfirmDeleteDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/bento";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

type EventDraft = Omit<CampusEvent, "views" | "registerClicks">;

function emptyDraft(): EventDraft {
  return {
    id: slugify("event"),
    title: "",
    organizer: "",
    date: new Date().toISOString().slice(0, 10),
    venue: "",
    description: "",
    eligibility: "Open to all students.",
    registrationUrl: "",
    accent: "blue",
    status: "approved",
  };
}

function EventFormDialog({ event, trigger }: { event?: CampusEvent; trigger: React.ReactNode }) {
  const { clubs, addEvent, updateEvent } = useContent();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(event ?? emptyDraft());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!event;

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }) as EventDraft);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (
      !draft.title.trim() ||
      !draft.organizer.trim() ||
      !draft.venue.trim() ||
      !draft.description.trim()
    ) {
      setError("Title, organizer, venue and description are required.");
      return;
    }
    if (draft.endDate && draft.endDate < draft.date) {
      setError("End date can't be before the start date.");
      return;
    }
    if (
      draft.date === (draft.endDate || draft.date) &&
      draft.startTime &&
      draft.endTime &&
      draft.endTime <= draft.startTime
    ) {
      setError("End time must be later than the start time.");
      return;
    }
    if (draft.registrationDeadline && draft.registrationDeadline > draft.date) {
      setError("Registration deadline can't be after the event date.");
      return;
    }
    if (draft.registrationUrl && !hasRealUrl(draft.registrationUrl)) {
      setError("Registration URL must be a valid http:// or https:// link.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = isEdit
        ? draft
        : { ...draft, id: `${slugify(draft.title)}-${Date.now().toString(36)}` };
      if (isEdit) await updateEvent(event.id, payload);
      else await addEvent(payload);
      setOpen(false);
      setDraft(emptyDraft());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the event.");
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
          setDraft(event ?? emptyDraft());
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit event" : "Create event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title" required>
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className={fieldClass}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organizer" required>
              <input
                value={draft.organizer}
                onChange={(e) => set("organizer", e.target.value)}
                className={fieldClass}
                required
              />
            </Field>
            <Field label="Club" hint="Optional — links this event to a club's page.">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" required>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
                className={fieldClass}
                required
              />
            </Field>
            <Field label="End date" hint="Optional — for multi-day events.">
              <input
                type="date"
                value={draft.endDate ?? ""}
                onChange={(e) => set("endDate", e.target.value || undefined)}
                className={fieldClass}
              />
            </Field>
            <Field label="Start time">
              <input
                type="time"
                value={draft.startTime ?? ""}
                onChange={(e) => set("startTime", e.target.value || undefined)}
                className={fieldClass}
              />
            </Field>
            <Field label="End time" hint="Optional.">
              <input
                type="time"
                value={draft.endTime ?? ""}
                onChange={(e) => set("endTime", e.target.value || undefined)}
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Venue" required>
            <input
              value={draft.venue}
              onChange={(e) => set("venue", e.target.value)}
              className={fieldClass}
              required
            />
          </Field>
          <Field label="Description" required>
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={fieldClass}
              required
            />
          </Field>
          <Field label="Eligibility" required>
            <input
              value={draft.eligibility}
              onChange={(e) => set("eligibility", e.target.value)}
              className={fieldClass}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registration deadline" hint="Optional.">
              <input
                type="date"
                value={draft.registrationDeadline ?? ""}
                onChange={(e) => set("registrationDeadline", e.target.value || undefined)}
                className={fieldClass}
              />
            </Field>
            <Field label="Contact" hint="Optional — email or phone.">
              <input
                value={draft.contact ?? ""}
                onChange={(e) => set("contact", e.target.value || undefined)}
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Registration URL" hint="Leave blank if not open yet.">
            <UrlField
              value={draft.registrationUrl}
              onChange={(e) => set("registrationUrl", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accent color">
              <select
                value={draft.accent}
                onChange={(e) => set("accent", e.target.value as CampusEvent["accent"])}
                className={fieldClass}
              >
                {ACCENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <label className="mt-6 flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={draft.featured ?? false}
                onChange={(e) => set("featured", e.target.checked)}
                className="size-4 rounded border-input"
              />
              Featured
            </label>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 items-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create event"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const SORTS = [
  { value: "date_asc", label: "Date (soonest)" },
  { value: "date_desc", label: "Date (latest)" },
  { value: "title", label: "Title A–Z" },
  { value: "views", label: "Most viewed" },
];

export default function AdminEventsPage() {
  const { events, clubs, loading, error, refresh, remove } = useContent();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date_asc");
  const [searchParams] = useSearchParams();
  // Following a "Rejected events" link from Overview shows only those;
  // otherwise Admin sees everything (pending/rejected carry a status badge
  // inline — see SubmissionStatusBadge above) — same convention as Notices.
  const statusFilter = searchParams.get("status");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = events
      .filter((e) => (statusFilter === "rejected" ? e.status === "rejected" : true))
      .filter((e) =>
        q ? `${e.title} ${e.organizer} ${e.venue}`.toLowerCase().includes(q) : true,
      );
    switch (sort) {
      case "date_desc":
        return [...list].sort((a, b) => b.date.localeCompare(a.date));
      case "title":
        return [...list].sort((a, b) => a.title.localeCompare(b.title));
      case "views":
        return [...list].sort((a, b) => b.views - a.views);
      default:
        return [...list].sort((a, b) => a.date.localeCompare(b.date));
    }
  }, [events, search, sort, statusFilter]);

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">Events</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          Create, edit and remove campus events. Set a real start time so Google Calendar links come
          out right.
        </p>
      </Card>

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search events…"
        sortOptions={SORTS}
        sort={sort}
        onSort={setSort}
        count={filtered.length}
        noun="event"
        extra={
          <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">
            <BulkImportDialog kind="events" clubs={clubs} onImported={refresh} />
            <EventFormDialog trigger={<CreateButton />} />
          </div>
        }
      />

      {loading && events.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error && events.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={events.length === 0 ? "No events yet" : "No events match your search"}
          hint={
            events.length === 0 ? "Create the first campus event." : "Try a different search term."
          }
        />
      ) : (
        <Card className="divide-y divide-border/60 p-2 border-border/70 shadow-sm">
          {filtered.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 p-3 list-none">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              >
                <CalendarDays className="size-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{e.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(e.date)} · {formatEventTimeRange(e) || "No time set"} · {e.venue}
                </p>
              </div>
              {e.isDraft ? <DraftBadge /> : null}
              {e.status !== "approved" ? <SubmissionStatusBadge status={e.status} /> : null}
              {e.featured ? (
                <Badge variant="secondary" className="gap-1">
                  <Star className="size-3 fill-current" aria-hidden="true" />
                  Featured
                </Badge>
              ) : null}
              <span className="text-xs font-semibold text-muted-foreground">{e.views} views</span>
              <div className="flex shrink-0 gap-1.5">
                <EventFormDialog
                  event={e}
                  trigger={
                    <button
                      type="button"
                      aria-label={`Edit ${e.title}`}
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
                      aria-label={`Delete ${e.title}`}
                      className="grid size-9 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  }
                  title={`Delete "${e.title}"?`}
                  description="This event will be permanently removed. This can't be undone."
                  onConfirm={() => remove("events", e.id)}
                />
              </div>
            </li>
          ))}
        </Card>
      )}
    </div>
  );
}

const CreateButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      <Plus className="size-4" aria-hidden="true" />
      New event
    </button>
  ),
);
CreateButton.displayName = "CreateButton";
