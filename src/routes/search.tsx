import { Link, useSearchParams } from "react-router-dom";
import { Bell, Briefcase, ChevronRight, Search as SearchIcon, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const TYPE_ICONS: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  NOTICE: Bell,
  EVENT: ({ className }) => <span className={className}>📅</span>,
  CLUB: Users,
  OPPORTUNITY: Briefcase,
  "BUY & SELL": ({ className }) => <span className={className}>🏷️</span>,
};

const TYPE_COLORS: Record<SearchResultType, { bg: string; text: string }> = {
  NOTICE: { bg: "bg-amber-50", text: "text-amber-600" },
  EVENT: { bg: "bg-violet-50", text: "text-violet-600" },
  CLUB: { bg: "bg-emerald-50", text: "text-emerald-600" },
  OPPORTUNITY: { bg: "bg-blue-50", text: "text-blue-600" },
  "BUY & SELL": { bg: "bg-orange-50", text: "text-orange-600" },
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
    <div className="flex flex-col gap-6">
      {/* Search bar */}
      <form
        className="shadow-bento rounded-xl bg-card border border-border flex px-5 items-center gap-3 h-14"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchParams(value ? { q: value } : {});
        }}
      >
        <SearchIcon className="text-primary size-5 shrink-0" aria-hidden="true" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search notices, events, clubs, opportunities…"
          aria-label="Search CampusBoard"
          className="min-h-11 w-full bg-transparent text-sm font-semibold outline-none text-foreground"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shrink-0"
        >
          Search
        </button>
      </form>

      {/* Type filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setType(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !type ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          All
        </button>
        {SEARCH_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t === type ? null : t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Results heading */}
      <h1 className="text-sm font-bold text-muted-foreground">
        {q
          ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${q}"`
          : "Type to search CampusBoard"}
      </h1>

      {/* Results list */}
      {results.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {results.map((r) => {
            const Icon = TYPE_ICONS[r.type as SearchResultType] ?? SearchIcon;
            const color = TYPE_COLORS[r.type as SearchResultType] ?? { bg: "bg-secondary", text: "text-foreground" };
            return (
              <li key={`${r.type}-${r.id}`}>
                <Link to={r.to}>
                  <Card className="shadow-bento rounded-xl bg-card border-border p-4 hover:shadow-md transition-shadow flex items-center gap-4">
                    <div className={`rounded-xl ${color.bg} ${color.text} flex justify-center items-center size-10 shrink-0`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className={`rounded-full ${color.bg} ${color.text} text-[10px] mb-1`}>
                        {TYPE_LABELS[r.type as SearchResultType] ?? r.type}
                      </Badge>
                      <p className="font-semibold text-foreground truncate">{r.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{r.subtitle}</p>
                    </div>
                    <ChevronRight className="text-muted-foreground size-5 shrink-0" />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : q ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <h3 className="font-semibold text-foreground text-lg">No results found</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Try a different search term or filter.
          </p>
        </Card>
      ) : null}

      <Link to="/" className="text-sm font-semibold text-primary hover:underline">
        ← Back home
      </Link>
    </div>
  );
}
