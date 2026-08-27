import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useMemo, useState } from "react";

import { ChipFilter, ResultCount, SearchField } from "@/components/filters";
import { useContent } from "@/lib/content";
import { OPPORTUNITY_TYPES, formatDate } from "@/lib/data";
import { usePageMeta } from "@/lib/seo";
import { opportunityIcon } from "@/lib/icons";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/bento";

export default function OpportunitiesPage() {
  usePageMeta(
    "Opportunities — CampusBoard",
    "Internships, jobs, hackathons, research and fellowships open to students.",
  );

  const { opportunities, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities
      .filter((o) => (type ? o.type === type : true))
      .filter((o) =>
        q
          ? `${o.title} ${o.organization} ${o.position} ${o.skills.join(" ")}`
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [opportunities, query, type]);

  return (
    <div className="space-y-5">
      <header className="bento p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          Opportunities
        </p>
        <h1 className="pt-2 text-3xl font-extrabold sm:text-4xl">Internships, jobs & more</h1>
      </header>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search by role, company or skill…"
        label="Search opportunities"
      />
      <ChipFilter
        options={OPPORTUNITY_TYPES}
        value={type}
        onChange={setType}
        allLabel="All types"
        label="Filter opportunities by type"
      />
      <ResultCount count={filtered.length} noun="opportunity" />

      {loading && opportunities.length === 0 ? (
        <SkeletonGrid />
      ) : error && opportunities.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches yet"
          hint="Try another type or search term."
          action={
            (query || type) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setType(null);
                }}
                className="inline-flex min-h-9 items-center rounded-full border border-foreground/20 bg-card px-4 text-xs font-bold hover:bg-accent"
              >
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((o) => {
            const Icon = opportunityIcon(o.type);
            return (
              <li key={o.id}>
                <Link
                  to={`/opportunities/${o.id}`}
                  className="bento bento-hover grid h-full grid-cols-[auto_minmax(0,1fr)] gap-4 p-5"
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple/25 text-navy ring-1 ring-navy/10"
                    aria-hidden="true"
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    {o.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow/30 px-2 py-1 text-[10px] font-extrabold tracking-wide text-navy">
                        <Star className="size-3 fill-current" aria-hidden="true" />
                        FEATURED
                      </span>
                    ) : null}
                    <span className="block pt-2 text-xs font-bold text-muted-foreground uppercase">
                      {o.organization} · {o.type}
                    </span>
                    <span className="block pt-2 text-lg font-bold">{o.title}</span>
                    <span className="block pt-1 text-sm text-muted-foreground">{o.position}</span>
                    <span className="block pt-3 text-xs font-semibold">
                      Deadline: {formatDate(o.deadline)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
