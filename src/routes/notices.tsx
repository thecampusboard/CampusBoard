import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import { ChipFilter, ResultCount, SearchField } from "@/components/filters";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { NOTICE_CATEGORIES, formatDate, publicNotices } from "@/lib/data";
import { noticeIcon } from "@/lib/icons";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/bento";

export default function NoticesPage() {
  usePageMeta(
    "Campus Notices — CampusBoard",
    "Official academic, examination, placement and department notices for the campus.",
  );

  const { notices, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const publicNoticesList = useMemo(() => publicNotices(notices), [notices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publicNoticesList
      .filter((n) => (category ? n.category === category : true))
      .filter((n) =>
        q ? `${n.title} ${n.description} ${n.department}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [publicNoticesList, query, category]);

  const hasFilters = !!(query || category);

  return (
    <div className="space-y-5">
      <header className="bento p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          Notices
        </p>
        <h1 className="pt-2 text-3xl font-extrabold sm:text-4xl">Official campus notices</h1>
      </header>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search notices by title, department…"
        label="Search notices"
      />
      <ChipFilter
        options={NOTICE_CATEGORIES}
        value={category}
        onChange={setCategory}
        allLabel="All categories"
        label="Filter notices by category"
      />
      <ResultCount count={filtered.length} noun="notice" />

      {loading && publicNoticesList.length === 0 ? (
        <SkeletonGrid />
      ) : error && publicNoticesList.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No notices match your filters"
          hint="Try a different category or clear the search."
          action={
            hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
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
          {filtered.map((n) => {
            const Icon = noticeIcon(n.category);
            return (
              <li key={n.id}>
                <Link
                  to={`/notices/${n.id}`}
                  className="bento bento-hover grid h-full grid-cols-[auto_minmax(0,1fr)] gap-4 p-5"
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange/20 text-navy ring-1 ring-navy/10"
                    aria-hidden="true"
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-muted-foreground uppercase">
                      {n.category}
                    </span>
                    <span className="block pt-1 text-lg font-bold">{n.title}</span>
                    <span className="block pt-1 text-sm text-muted-foreground">
                      {n.description}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 pt-3 text-xs font-semibold">
                      <span>{formatDate(n.date)}</span>
                      {n.externalUrl ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue/10 px-2 py-1 text-[10px] font-extrabold text-navy">
                          <ExternalLink className="size-3" aria-hidden="true" />
                          External link
                        </span>
                      ) : null}
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
