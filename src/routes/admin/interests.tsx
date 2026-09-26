import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Mail, Phone, Trash2, Users } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/data";
import { INTEREST_COLUMNS, INTEREST_STATUSES } from "@/lib/interests";
import type { InterestRow, InterestStatus } from "@/lib/interests";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { ConfirmDeleteDialog } from "@/components/confirm-dialog";
import { DescriptionText } from "@/components/description-text";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/bento";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KindFilter = "all" | "club" | "chapter";
type StatusFilter = "all" | InterestStatus;

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "club", label: "Clubs" },
  { value: "chapter", label: "Chapters" },
];

const STATUS_STYLES: Record<InterestStatus, string> = {
  new: "bg-primary/10 text-primary",
  contacted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  archived: "bg-secondary text-muted-foreground",
};

function targetOf(row: InterestRow) {
  if (row.kind === "club") {
    return {
      label: row.clubs?.name ?? "Deleted club",
      to: row.club_id && row.clubs ? `/clubs/${row.club_id}` : null,
    };
  }
  return {
    label: row.chapters?.name ?? "Deleted chapter",
    to: row.chapter_id && row.chapters ? `/chapters/${row.chapter_id}` : null,
  };
}

export default function AdminInterestsPage() {
  const [rows, setRows] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("community_interests")
      .select(INTEREST_COLUMNS)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setRows((data ?? []) as unknown as InterestRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return `${r.student_name} ${r.student_email} ${targetOf(r).label} ${r.course_year ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, kind, status]);

  const updateStatus = async (id: string, next: InterestStatus) => {
    setRowError(null);
    const { data, error: err } = await supabase
      .from("community_interests")
      .update({ status: next })
      .eq("id", id)
      .select("id");
    if (err || !data || data.length === 0) {
      setRowError("Couldn't update that submission's status. Refresh and try again.");
      return;
    }
    setRows((current) => current.map((r) => (r.id === id ? { ...r, status: next } : r)));
  };

  const remove = async (id: string) => {
    const { data, error: err } = await supabase
      .from("community_interests")
      .delete()
      .eq("id", id)
      .select("id");
    if (err) throw new Error(err.message);
    if (!data || data.length === 0) throw new Error("That submission no longer exists.");
    setRows((current) => current.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-8 border-border/70 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
          Interest submissions
        </h1>
        <p className="pt-2 text-sm text-muted-foreground">
          Students who tapped “Interested to Join” on a club or chapter. This is a lead list, not
          membership — nobody is added to a club or chapter from here.
        </p>
      </Card>

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, email or club/chapter…"
        count={filtered.length}
        noun="submission"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter by type"
              className="inline-flex rounded-xl border border-border bg-secondary p-1"
            >
              {KIND_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={kind === f.value}
                  onClick={() => setKind(f.value)}
                  className={cn(
                    "min-h-9 rounded-lg px-3 text-xs font-bold transition",
                    kind === f.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              aria-label="Filter by status"
              className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All statuses</option>
              {INTEREST_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {rowError ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {rowError}
        </p>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error && rows.length === 0 ? (
        <ErrorState hint={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No submissions yet" : "No submissions match your filters"}
          hint={
            rows.length === 0
              ? "When a student taps “Interested to Join” on a club or chapter, it shows up here."
              : "Try a different search or filter."
          }
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {filtered.map((r) => {
            const target = targetOf(r);
            const TargetIcon = r.kind === "club" ? Users : Layers;
            return (
              <li key={r.id} className="min-w-0">
                <Card className="min-w-0 border-border/70 p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="break-words text-sm font-bold text-foreground">
                        {r.student_name || "Unknown student"}
                      </p>
                      <a
                        href={`mailto:${r.student_email}`}
                        className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{r.student_email}</span>
                      </a>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize",
                        STATUS_STYLES[r.status],
                      )}
                    >
                      {r.status}
                    </span>
                  </div>

                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0">
                      <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                        {r.kind === "club" ? "Club" : "Chapter"}
                      </dt>
                      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 font-semibold">
                        <TargetIcon className="size-3.5 shrink-0" aria-hidden="true" />
                        {target.to ? (
                          <Link to={target.to} className="truncate hover:underline">
                            {target.label}
                          </Link>
                        ) : (
                          <span className="truncate text-muted-foreground">{target.label}</span>
                        )}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                        Submitted
                      </dt>
                      <dd className="mt-0.5 font-semibold">{formatDate(r.created_at)}</dd>
                    </div>
                    {r.course_year ? (
                      <div className="min-w-0">
                        <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                          Course &amp; year
                        </dt>
                        <dd className="mt-0.5 break-words font-semibold">{r.course_year}</dd>
                      </div>
                    ) : null}
                    {r.phone ? (
                      <div className="min-w-0">
                        <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                          Phone
                        </dt>
                        <dd className="mt-0.5">
                          <a
                            href={`tel:${r.phone}`}
                            className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                          >
                            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                            {r.phone}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {r.message ? (
                    <div className="mt-3 rounded-xl bg-secondary/50 p-3">
                      <DescriptionText text={r.message} className="space-y-2 text-sm" />
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                      Status
                      <select
                        value={r.status}
                        onChange={(e) => void updateStatus(r.id, e.target.value as InterestStatus)}
                        className="min-h-10 rounded-lg border border-border bg-card px-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        {INTEREST_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <ConfirmDeleteDialog
                      trigger={
                        <button
                          type="button"
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete
                        </button>
                      }
                      title="Delete this submission?"
                      description={`${r.student_name || "This student"}'s interest in ${target.label} will be permanently removed. They will be able to submit again.`}
                      onConfirm={() => remove(r.id)}
                    />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
