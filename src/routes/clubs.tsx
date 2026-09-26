import { Link } from "react-router-dom";
import { ChevronRight, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { publicClubs } from "@/lib/data";
import { publicStorageUrl } from "@/lib/supabase";

const ACCENT_ICONS: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  sky: { bg: "bg-sky-50", text: "text-sky-600" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-600" },
  yellow: { bg: "bg-amber-50", text: "text-amber-600" },
  purple: { bg: "bg-violet-50", text: "text-violet-600" },
  pink: { bg: "bg-pink-50", text: "text-pink-600" },
  navy: { bg: "bg-indigo-50", text: "text-indigo-600" },
};

export default function ClubsPage() {
  usePageMeta(
    "Clubs & Societies — CampusBoard",
    "Every student club and society on campus, with recruitment and event updates.",
  );

  const { clubs, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publicClubs(clubs).filter((c) =>
      q ? `${c.name} ${c.tagline} ${c.about}`.toLowerCase().includes(q) : true,
    );
  }, [clubs, query]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <p className="font-bold uppercase text-emerald-600 text-xs tracking-[0.22em]">
          Student life
        </p>
        <h1 className="font-bold text-foreground text-3xl sm:text-4xl tracking-tight">
          Clubs & Societies
        </h1>
        <p className="text-muted-foreground text-base">
          Explore student-run organizations and find your community
        </p>
      </div>

      {/* Search */}
      <div className="shadow-bento rounded-xl bg-card border border-border flex px-5 items-center gap-3 h-14">
        <Search className="text-primary size-5 shrink-0" />
        <input
          placeholder="Search clubs by name or interest…"
          className="bg-transparent text-foreground text-sm border-none outline-none h-full flex-1 min-w-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search clubs"
        />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-muted-foreground text-sm">
          {filtered.length} club{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Results */}
      {loading && clubs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading clubs…
          </div>
        </div>
      ) : error && clubs.length === 0 ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <h3 className="font-semibold text-foreground text-lg">No clubs found</h3>
          <p className="text-muted-foreground text-sm mt-2">Try a different search term.</p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 inline-flex h-9 items-center rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              Clear search
            </button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const accent: { bg: string; text: string } = ACCENT_ICONS[c.accent as keyof typeof ACCENT_ICONS] ?? { bg: "bg-blue-50", text: "text-blue-600" };
            return (
              <Link key={c.id} to={`/clubs/${c.id}`}>
                <Card className="shadow-bento rounded-xl bg-card border-border p-5 h-full hover:shadow-md transition-shadow flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {c.imagePath ? (
                        <img
                          src={publicStorageUrl("content-images", c.imagePath)}
                          alt=""
                          className="size-12 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className={`rounded-xl ${accent!.bg} ${accent!.text} flex justify-center items-center size-12 shrink-0`}>
                          <Users className="size-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                        <p className="text-muted-foreground text-sm truncate">{c.tagline}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground size-5 shrink-0 mt-1" />
                  </div>
                  <CardContent className="p-0 flex flex-col gap-2">
                    <p className="text-muted-foreground text-sm line-clamp-2">{c.about}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {c.members} members
                      </span>
                      {c.founded && <span>Founded {c.founded}</span>}
                    </div>
                    {c.recruitment && (
                      <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-600 text-[10px] w-fit mt-1">
                        Recruiting: {c.recruitment}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
