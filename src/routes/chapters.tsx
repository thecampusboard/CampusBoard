import { Link } from "react-router-dom";
import { ChevronRight, GraduationCap, Layers, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DescriptionPreview } from "@/components/description-text";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
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

export default function ChaptersPage() {
  usePageMeta(
    "Chapters — CampusBoard",
    "Student-run chapters on campus, guided by faculty mentors and chapter heads.",
  );

  const { chapters, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chapters.filter((c) =>
      q
        ? `${c.name} ${c.tagline} ${c.about} ${c.facultyMentor} ${c.chapterHeads.join(" ")}`
            .toLowerCase()
            .includes(q)
        : true,
    );
  }, [chapters, query]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <p className="font-bold uppercase text-violet-600 text-xs tracking-[0.22em]">
          Student-run communities
        </p>
        <h1 className="font-bold text-foreground text-3xl sm:text-4xl tracking-tight">Chapters</h1>
        <p className="text-muted-foreground text-base">
          Chapters are managed by students and regulated by faculty mentors and chapter heads.
          Looking for SEE-managed communities?{" "}
          <Link to="/clubs" className="font-semibold text-primary hover:underline">
            Browse Clubs
          </Link>
          .
        </p>
      </div>

      {/* Search */}
      <div className="shadow-bento rounded-xl bg-card border border-border flex px-4 sm:px-5 items-center gap-3 h-14">
        <Search className="text-primary size-5 shrink-0" aria-hidden="true" />
        <input
          placeholder="Search chapters by name, mentor or interest…"
          className="bg-transparent text-foreground text-sm border-none outline-none h-full flex-1 min-w-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search chapters"
        />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-muted-foreground text-sm">
          {filtered.length} chapter{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Results */}
      {loading && chapters.length === 0 ? (
        <div className="flex items-center justify-center py-20" role="status">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading chapters…
          </div>
        </div>
      ) : error && chapters.length === 0 ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <h3 className="font-semibold text-foreground text-lg">
            {chapters.length === 0 ? "No chapters yet" : "No chapters found"}
          </h3>
          <p className="text-muted-foreground text-sm mt-2">
            {chapters.length === 0
              ? "Chapters will appear here once they're added."
              : "Try a different search term."}
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              Clear search
            </button>
          )}
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const accent = ACCENT_ICONS[c.accent] ?? { bg: "bg-blue-50", text: "text-blue-600" };
            return (
              <li key={c.id} className="min-w-0">
                <Link to={`/chapters/${c.id}`} className="block h-full rounded-xl">
                  <Card className="shadow-bento rounded-xl bg-card border-border p-5 h-full hover:shadow-md transition-shadow flex flex-col gap-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {c.imagePath ? (
                          <img
                            src={publicStorageUrl("content-images", c.imagePath)}
                            alt=""
                            loading="lazy"
                            className="size-12 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className={`rounded-xl ${accent.bg} ${accent.text} flex justify-center items-center size-12 shrink-0`}
                          >
                            <Layers className="size-6" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="font-semibold text-foreground truncate">{c.name}</h2>
                          <p className="text-muted-foreground text-sm truncate">{c.tagline}</p>
                        </div>
                      </div>
                      <ChevronRight
                        className="text-muted-foreground size-5 shrink-0 mt-1"
                        aria-hidden="true"
                      />
                    </div>
                    <CardContent className="p-0 flex flex-1 flex-col gap-2">
                      <DescriptionPreview text={c.about} lines={3} />
                      <div className="mt-auto flex flex-col gap-1 pt-1 text-xs text-muted-foreground">
                        {c.facultyMentor ? (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <GraduationCap className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">Mentor: {c.facultyMentor}</span>
                          </span>
                        ) : null}
                        {c.chapterHeads.length > 0 ? (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              {c.chapterHeads.length > 1 ? "Heads" : "Head"}:{" "}
                              {c.chapterHeads.join(", ")}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      {c.recruitment && (
                        <Badge
                          variant="secondary"
                          className="mt-1 h-auto w-fit max-w-full rounded-full bg-emerald-50 text-emerald-600 text-[10px] whitespace-normal"
                        >
                          Recruiting: {c.recruitment}
                        </Badge>
                      )}
                    </CardContent>
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
