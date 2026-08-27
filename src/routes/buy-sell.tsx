import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { ChipFilter, ResultCount, SearchField } from "@/components/filters";
import { useContent } from "@/lib/content";
import { LISTING_CATEGORIES, formatPrice, publicListings } from "@/lib/data";
import { listingIcon } from "@/lib/icons";
import { usePageMeta } from "@/lib/seo";
import { publicStorageUrl } from "@/lib/supabase";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/bento";
import { Badge } from "@/components/ui/badge";

const SORTS = ["Newest", "Price: low to high", "Price: high to low"] as const;

export default function BuySellPage() {
  usePageMeta(
    "Buy & Sell — CampusBoard",
    "Student marketplace for books, electronics, stationery and hostel essentials.",
  );

  const { listings: allListings, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<string | null>(null);

  const activeListings = useMemo(() => publicListings(allListings), [allListings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = activeListings
      .filter((l) => (category ? l.category === category : true))
      .filter((l) => (q ? `${l.title} ${l.description}`.toLowerCase().includes(q) : true));
    if (sort === "Price: low to high") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "Price: high to low") return [...list].sort((a, b) => b.price - a.price);
    return [...list].sort((a, b) => b.postedOn.localeCompare(a.postedOn));
  }, [activeListings, query, category, sort]);

  const hasFilters = !!(query || category || sort);

  return (
    <div className="space-y-5">
      <header className="bento flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
            Buy & Sell
          </p>
          <h1 className="pt-2 text-3xl font-extrabold sm:text-4xl">Campus marketplace</h1>
        </div>
        <Link
          to="/buy-sell/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition hover:bg-navy/90 active:scale-[0.98]"
        >
          <Plus className="size-4" aria-hidden="true" />
          Post an item
        </Link>
      </header>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search the marketplace…"
        label="Search listings"
      />
      <ChipFilter
        options={LISTING_CATEGORIES}
        value={category}
        onChange={setCategory}
        allLabel="All categories"
        label="Filter listings by category"
      />
      <ChipFilter
        options={SORTS}
        value={sort}
        onChange={setSort}
        allLabel="Default"
        label="Sort listings"
      />
      <ResultCount count={filtered.length} noun="listing" />

      {loading && activeListings.length === 0 ? (
        <SkeletonGrid count={6} />
      ) : error && activeListings.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No listings match your filters" : "Nothing on sale here yet"}
          hint={hasFilters ? "Try a different search or category." : "Be the first to post an item."}
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                  setSort(null);
                }}
                className="inline-flex min-h-9 items-center rounded-full border border-foreground/20 bg-card px-4 text-xs font-bold hover:bg-accent"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/buy-sell/new"
                className="inline-flex min-h-9 items-center rounded-full bg-navy px-4 text-xs font-bold text-navy-foreground transition-colors hover:bg-navy/90"
              >
                Post an item
              </Link>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => {
            const Icon = listingIcon(l.id, l.category);
            const coverImage = l.images?.[0] ? publicStorageUrl("listing-images", l.images[0]) : null;
            return (
              <li key={l.id}>
                <Link
                  to={`/buy-sell/${l.id}`}
                  className="bento bento-hover flex h-full flex-col overflow-hidden p-0"
                >
                  <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-yellow/20">
                    {coverImage ? (
                      <img src={coverImage} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid size-full place-items-center text-navy/40" aria-hidden="true">
                        <Icon className="size-10" strokeWidth={1.5} />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-card/90 text-foreground shadow-sm">
                      {l.category}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="block text-lg leading-tight font-bold">{l.title}</span>
                    <span className="block pt-2 text-xl font-extrabold">{formatPrice(l.price)}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs font-semibold text-muted-foreground">
                      <span>{l.condition}</span>
                      <span className="truncate">{l.sellerName}</span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
