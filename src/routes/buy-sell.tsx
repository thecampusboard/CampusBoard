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
import { Card } from "@/components/ui/card";

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
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8 border-border/70 shadow-sm">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary uppercase">Buy & Sell</p>
          <h1 className="pt-2 text-3xl font-display font-extrabold tracking-tight sm:text-4xl text-foreground">
            Campus marketplace
          </h1>
          <p className="pt-1 text-sm text-muted-foreground">
            Buy and sell books, electronics, hostel essentials and more with trusted campus peers.
          </p>
        </div>
        <Link
          to="/buy-sell/new"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus className="size-4" aria-hidden="true" />
          Post an item
        </Link>
      </Card>

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
          hint={
            hasFilters ? "Try a different search or category." : "Be the first to post an item."
          }
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
                className="inline-flex min-h-9 items-center rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Post an item
              </Link>
            )
          }
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => {
            const Icon = listingIcon(l.id, l.category);
            const coverImage = l.images?.[0]
              ? publicStorageUrl("listing-images", l.images[0])
              : null;
            return (
              <li key={l.id}>
                <Link to={`/buy-sell/${l.id}`} className="group block h-full">
                  <Card className="flex h-full flex-col overflow-hidden border-border/70 bg-card p-0 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted/60">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt=""
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="grid size-full place-items-center text-muted-foreground/40"
                          aria-hidden="true"
                        >
                          <Icon className="size-12" strokeWidth={1.5} />
                        </div>
                      )}
                      <Badge className="absolute top-2.5 left-2.5 border-border/60 bg-background/90 text-foreground font-semibold shadow-sm backdrop-blur-sm">
                        {l.category}
                      </Badge>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <span className="block text-base font-bold leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {l.title}
                      </span>
                      <span className="block pt-2 text-xl font-extrabold text-foreground">
                        {formatPrice(l.price)}
                      </span>
                      <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs font-medium text-muted-foreground border-t border-border/40">
                        <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
                          {l.condition}
                        </span>
                        <span className="truncate">{l.sellerName}</span>
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
