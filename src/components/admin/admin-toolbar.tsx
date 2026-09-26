import type { ReactNode } from "react";
import { Plus, Search as SearchIcon } from "lucide-react";

/**
 * Shared toolbar for every admin content list: search box, an optional sort
 * <select>, a live result count, and the Create button. Every admin list
 * page (Notices/Events/Clubs/Opportunities/Buy & Sell) uses this so the
 * search/filter/sort/count/create requirement is met identically everywhere
 * instead of being reinvented (and possibly missed) per page.
 */
export function AdminToolbar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  sortOptions,
  sort,
  onSort,
  count,
  noun,
  onCreate,
  createLabel = "New",
  extra,
}: {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  sortOptions?: { value: string; label: string }[];
  sort?: string;
  onSort?: (v: string) => void;
  count: number;
  noun: string;
  onCreate?: () => void;
  createLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="min-h-10 w-full min-w-0 bg-transparent text-sm outline-none"
        />
      </div>
      {sortOptions && onSort ? (
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          aria-label="Sort"
          className="min-h-10 shrink-0 rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
      {extra}
      <p className="shrink-0 text-xs font-bold text-muted-foreground">
        {count} {count === 1 ? noun : `${noun}s`}
      </p>
      {onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] sm:ml-auto"
        >
          <Plus className="size-4" aria-hidden="true" />
          {createLabel}
        </button>
      ) : null}
    </div>
  );
}
