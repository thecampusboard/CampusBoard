import { Link, useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { ChipFilter } from "@/components/filters";
import { useContent } from "@/lib/content";
import { globalSearch, SEARCH_TYPES } from "@/lib/data";
import type { SearchResultType } from "@/lib/data";
import { usePageMeta } from "@/lib/seo";

const TYPE_LABELS: Record<SearchResultType, string> = {
  NOTICE: "Notices",
  EVENT: "Events",
  CLUB: "Clubs",
  OPPORTUNITY: "Opportunities",
  "BUY & SELL": "Buy & Sell",
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [value, setValue] = useState(q);
  const [type, setType] = useState<string | null>(null);
  const { notices, events, clubs, opportunities, listings } = useContent();

  usePageMeta(
    "Search — CampusBoard",
    "Search notices, events, clubs, opportunities and marketplace listings.",
    // Query-driven results page — same content-shape concern as admin/
    // dashboard: no single canonical version worth ranking, and every ?q=
    // variation would otherwise compete with the real content pages it
    // links to.
    { noindex: true },
  );

  const allResults = useMemo(
    () => globalSearch(q, { notices, events, clubs, opportunities, listings }),
    [q, notices, events, clubs, opportunities, listings],
  );

  const results = useMemo(
    () => (type ? allResults.filter((r) => r.type === type) : allResults),
    [allResults, type],
  );

  return (
    <div className="space-y-5">
      <form
        className="bento flex items-center gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchParams(value ? { q: value } : {});
        }}
      >
        <SearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search notices, events, clubs, opportunities…"
          aria-label="Search CampusBoard"
          className="min-h-11 w-full bg-transparent text-sm font-semibold outline-none"
        />
      </form>

      <ChipFilter
        options={SEARCH_TYPES.map((t) => TYPE_LABELS[t])}
        value={type ? TYPE_LABELS[type as SearchResultType] : null}
        onChange={(label) => {
          const entry = SEARCH_TYPES.find((t) => TYPE_LABELS[t] === label);
          setType(entry ?? null);
        }}
        allLabel="All"
        label="Filter search results by type"
      />

      <h1 className="px-1 text-sm font-bold text-muted-foreground">
        {q ? `${results.length} results for “${q}”` : "Type to search CampusBoard"}
      </h1>

      <ul className="grid gap-3">
        {results.map((r) => (
          <li key={`${r.type}-${r.id}`}>
            <Link to={r.to} className="bento bento-hover block p-4">
              <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
                {r.type}
              </p>
              <p className="pt-1 text-base font-bold">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.subtitle}</p>
            </Link>
          </li>
        ))}
      </ul>

      <Link to="/" className="inline-block px-1 text-sm font-bold underline">
        Back home
      </Link>
    </div>
  );
}
