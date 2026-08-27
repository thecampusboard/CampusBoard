import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Briefcase, Pencil, Plus, Trash2 } from "lucide-react";

import { useContent, slugify } from "@/lib/content";
import { ACCENTS, OPPORTUNITY_TYPES, formatDate } from "@/lib/data";
import type { Opportunity } from "@/lib/data";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
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

type OppDraft = Omit<Opportunity, "views" | "applyClicks">;

function emptyDraft(): OppDraft {
  return {
    id: slugify("opportunity"),
    title: "",
    organization: "",
    position: "",
    type: "Internship",
    location: "",
    eligibility: "Open to all students.",
    yearsBranches: "All years, all branches",
    description: "",
    skills: [],
    deadline: new Date().toISOString().slice(0, 10),
    applyUrl: "",
    accent: "purple",
  };
}

function OpportunityFormDialog({ opportunity, trigger }: { opportunity?: Opportunity; trigger: React.ReactNode }) {
  const { addOpportunity, updateOpportunity } = useContent();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<OppDraft>(opportunity ?? emptyDraft());
  const [skillsText, setSkillsText] = useState((opportunity?.skills ?? []).join(", "));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!opportunity;

  const set = <K extends keyof OppDraft>(key: K, value: OppDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }) as OppDraft);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!draft.title.trim() || !draft.organization.trim() || !draft.position.trim() || !draft.description.trim()) {
      setError("Title, organization, position and description are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const payload = {
        ...draft,
        id: isEdit ? opportunity.id : `${slugify(draft.title)}-${Date.now().toString(36)}`,
        skills,
      };
      if (isEdit) await updateOpportunity(opportunity.id, payload);
      else await addOpportunity(payload);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the opportunity.");
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
          const base = opportunity ?? emptyDraft();
          setDraft(base);
          setSkillsText((opportunity?.skills ?? []).join(", "));
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit opportunity" : "Create opportunity"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title" required>
            <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={fieldClass} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization" required>
              <input value={draft.organization} onChange={(e) => set("organization", e.target.value)} className={fieldClass} required />
            </Field>
            <Field label="Position" required>
              <input value={draft.position} onChange={(e) => set("position", e.target.value)} className={fieldClass} required />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select value={draft.type} onChange={(e) => set("type", e.target.value as Opportunity["type"])} className={fieldClass}>
                {OPPORTUNITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location" required>
              <input value={draft.location} onChange={(e) => set("location", e.target.value)} className={fieldClass} required placeholder="Remote / On-campus / City" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eligibility" required>
              <input value={draft.eligibility} onChange={(e) => set("eligibility", e.target.value)} className={fieldClass} required />
            </Field>
            <Field label="Years / Branches" required>
              <input value={draft.yearsBranches} onChange={(e) => set("yearsBranches", e.target.value)} className={fieldClass} required />
            </Field>
          </div>
          <Field label="Description" required>
            <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={3} className={fieldClass} required />
          </Field>
          <Field label="Skills" hint="Comma-separated, e.g. React, SQL, Figma">
            <input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} className={fieldClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stipend" hint="Optional.">
              <input value={draft.stipend ?? ""} onChange={(e) => set("stipend", e.target.value || undefined)} className={fieldClass} placeholder="₹15,000/month" />
            </Field>
            <Field label="Application deadline" required>
              <input type="date" value={draft.deadline} onChange={(e) => set("deadline", e.target.value)} className={fieldClass} required />
            </Field>
          </div>
          <Field label="Application URL">
            <UrlField value={draft.applyUrl} onChange={(e) => set("applyUrl", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accent color">
              <select value={draft.accent} onChange={(e) => set("accent", e.target.value as Opportunity["accent"])} className={fieldClass}>
                {ACCENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <label className="mt-6 flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={draft.featured ?? false} onChange={(e) => set("featured", e.target.checked)} className="size-4 rounded border-input" />
              Featured
            </label>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <button type="submit" disabled={submitting} className="inline-flex min-h-10 items-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60">
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create opportunity"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const SORTS = [
  { value: "deadline_asc", label: "Deadline (soonest)" },
  { value: "deadline_desc", label: "Deadline (latest)" },
  { value: "title", label: "Title A–Z" },
  { value: "views", label: "Most viewed" },
];

export default function AdminOpportunitiesPage() {
  const { opportunities, loading, error, refresh, remove } = useContent();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("deadline_asc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = opportunities.filter((o) =>
      q ? `${o.title} ${o.organization} ${o.position}`.toLowerCase().includes(q) : true,
    );
    switch (sort) {
      case "deadline_desc":
        return [...list].sort((a, b) => b.deadline.localeCompare(a.deadline));
      case "title":
        return [...list].sort((a, b) => a.title.localeCompare(b.title));
      case "views":
        return [...list].sort((a, b) => b.views - a.views);
      default:
        return [...list].sort((a, b) => a.deadline.localeCompare(b.deadline));
    }
  }, [opportunities, search, sort]);

  return (
    <div className="space-y-5">
      <div className="bento p-6">
        <h1 className="text-2xl font-extrabold">Opportunities</h1>
        <p className="pt-1 text-sm text-muted-foreground">Internships, jobs, hackathons and more.</p>
      </div>

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search opportunities…"
        sortOptions={SORTS}
        sort={sort}
        onSort={setSort}
        count={filtered.length}
        noun="opportunity"
        extra={
          <OpportunityFormDialog
            trigger={
              <button
                type="button"
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 text-sm font-bold text-navy-foreground transition hover:bg-navy/90 active:scale-[0.98] sm:ml-auto"
              >
                <Plus className="size-4" aria-hidden="true" />
                New opportunity
              </button>
            }
          />
        }
      />

      {loading && opportunities.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error && opportunities.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={opportunities.length === 0 ? "No opportunities yet" : "No opportunities match your search"}
          hint={opportunities.length === 0 ? "Create the first listing." : "Try a different search term."}
        />
      ) : (
        <ul className="bento divide-y divide-border p-2">
          {filtered.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-purple/25 text-navy" aria-hidden="true">
                <Briefcase className="size-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{o.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.organization} · {o.type} · Deadline {formatDate(o.deadline)}
                </p>
              </div>
              {o.featured ? <Badge variant="secondary">Featured</Badge> : null}
              <span className="text-xs font-semibold text-muted-foreground">{o.views} views</span>
              <div className="flex shrink-0 gap-1.5">
                <OpportunityFormDialog
                  opportunity={o}
                  trigger={
                    <button type="button" aria-label={`Edit ${o.title}`} className="grid size-9 place-items-center rounded-lg border border-border hover:bg-accent">
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  }
                />
                <ConfirmDeleteDialog
                  trigger={
                    <button type="button" aria-label={`Delete ${o.title}`} className="grid size-9 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  }
                  title={`Delete "${o.title}"?`}
                  description="This opportunity will be permanently removed. This can't be undone."
                  onConfirm={() => remove("opportunities", o.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
