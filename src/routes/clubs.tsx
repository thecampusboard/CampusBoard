import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";

import { ResultCount, SearchField } from "@/components/filters";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { clubIcon } from "@/lib/icons";
import { publicStorageUrl } from "@/lib/supabase";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/bento";

export default function ClubsPage() {
  usePageMeta(
    "Clubs & Societies — CampusBoard",
    "Every student club and society on campus, with recruitment and event updates.",
  );

  const { clubs, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) =>
      q ? `${c.name} ${c.tagline} ${c.about}`.toLowerCase().includes(q) : true,
    );
  }, [clubs, query]);

  return (
    <div className="space-y-5">
      <header className="bento p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">Clubs</p>
        <h1 className="pt-2 text-3xl font-extrabold sm:text-4xl">Student clubs & societies</h1>
      </header>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search clubs by name or interest…"
        label="Search clubs"
      />
      <ResultCount count={filtered.length} noun="club" />

      {loading && clubs.length === 0 ? (
        <SkeletonGrid />
      ) : error && clubs.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No clubs found"
          hint="Try a different search term."
          action={
            query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex min-h-9 items-center rounded-full border border-foreground/20 bg-card px-4 text-xs font-bold hover:bg-accent"
              >
                Clear search
              </button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const Icon = clubIcon(c.id);
            return (
              <li key={c.id}>
                <Link to={`/clubs/${c.id}`} className="bento bento-hover block h-full p-5">
                  {c.imagePath ? (
                    <img
                      src={publicStorageUrl("content-images", c.imagePath)}
                      alt=""
                      className="mb-3 size-12 rounded-xl object-cover ring-1 ring-navy/10"
                    />
                  ) : (
                    <span
                      className="mb-3 grid size-12 place-items-center rounded-xl bg-purple/25 text-navy ring-1 ring-navy/10"
                      aria-hidden="true"
                    >
                      <Icon className="size-6" strokeWidth={1.75} />
                    </span>
                  )}
                  <span className="block text-lg font-bold">{c.name}</span>
                  <span className="block pt-1 text-sm text-muted-foreground">{c.tagline}</span>
                  <span className="flex items-center gap-2 pt-3 text-xs font-semibold">
                    <Users className="size-4" aria-hidden="true" />
                    {c.members} members
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
