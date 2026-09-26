import { Link } from "react-router-dom";
import { Bell, ChevronRight, Clock3, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DescriptionPreview } from "@/components/description-text";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { NOTICE_CATEGORIES, formatDate, publicNotices } from "@/lib/data";

const NOTICE_DOTS = [
  "bg-primary",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-pink-500",
];

const CATEGORY_MAP: Record<string, string> = {
  all: "All notices",
  academic: "Academic",
  examination: "Examinations",
  administration: "Administration",
  placement: "Placement",
  club: "Club",
  other: "Other",
};

export default function NoticesPage() {
  usePageMeta(
    "Campus Notices — CampusBoard",
    "Official academic, examination, placement and department notices for the campus.",
  );

  const { notices, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const publicNoticesList = useMemo(() => publicNotices(notices), [notices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publicNoticesList
      .filter((n) => (category !== "all" ? n.category === category : true))
      .filter((n) =>
        q ? `${n.title} ${n.description} ${n.department}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [publicNoticesList, query, category]);

  const featuredNotices = useMemo(() => filtered.filter((n) => n.featured), [filtered]);
  const regularNotices = useMemo(() => filtered.filter((n) => !n.featured), [filtered]);

  const hasFilters = !!(query || category !== "all");

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-bold uppercase text-primary text-xs tracking-[0.22em]">
            Campus updates
          </p>
          <h1 className="font-bold text-foreground text-3xl sm:text-4xl tracking-tight">Notices</h1>
          <p className="text-muted-foreground text-base">
            Stay informed about everything happening across campus
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="shadow-bento rounded-xl bg-card border border-border flex px-4 sm:px-5 items-center gap-3 h-14">
        <Search className="text-primary size-5 shrink-0" />
        <input
          placeholder="Search notices by title, department or keyword"
          className="bg-transparent text-foreground text-sm border-none outline-none h-full flex-1 min-w-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search notices"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-secondary/60 p-1 sm:w-auto">
            {["all", ...NOTICE_CATEGORIES].map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="min-h-9 rounded-full px-3 text-sm capitalize sm:px-4"
              >
                {CATEGORY_MAP[cat] ?? cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span className="text-muted-foreground text-sm shrink-0">
          {filtered.length} notice{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Loading */}
      {loading && publicNoticesList.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading notices…
          </div>
        </div>
      ) : error && publicNoticesList.length === 0 ? (
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
          <h3 className="font-semibold text-foreground text-lg">No notices match your filters</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Try a different category or clear the search.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="mt-4 inline-flex h-9 items-center rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              Clear filters
            </button>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Featured / Important notices */}
          {featuredNotices.length > 0 && (
            <Card className="shadow-bento rounded-2xl bg-card border-border p-4 sm:p-6">
              <CardHeader className="flex p-0 pb-4 flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 text-primary flex justify-center items-center size-9">
                    <Bell className="size-5" />
                  </div>
                  <CardTitle className="text-foreground text-xl">Important notices</CardTitle>
                </div>
                <span className="text-muted-foreground text-sm">
                  {featuredNotices.length} notice{featuredNotices.length !== 1 ? "s" : ""}
                </span>
              </CardHeader>
              <CardContent className="flex p-0 flex-col">
                {featuredNotices.map((n, i) => (
                  <Link
                    key={n.id}
                    to={`/notices/${n.id}`}
                    className={`flex py-5 items-center gap-4 hover:bg-accent/30 rounded-lg px-2 transition-colors ${i < featuredNotices.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <span
                      className={`rounded-full ${NOTICE_DOTS[i % NOTICE_DOTS.length]} shrink-0 size-3`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-foreground line-clamp-2 [overflow-wrap:anywhere]">
                          {n.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-primary/10 text-primary text-[10px]"
                        >
                          Pinned
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mt-1">
                        {n.department}
                        <span className="px-1">•</span>
                        {formatDate(n.date)}
                      </p>
                      <DescriptionPreview text={n.description} lines={2} className="mt-1" />
                    </div>
                    <ChevronRight className="text-primary size-5 shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Regular notices */}
          {regularNotices.length > 0 && (
            <Card className="shadow-bento rounded-2xl bg-card border-border p-4 sm:p-6">
              <CardHeader className="flex p-0 pb-4 flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary text-muted-foreground flex justify-center items-center size-9">
                    <Clock3 className="size-5" />
                  </div>
                  <CardTitle className="text-foreground text-xl">
                    {featuredNotices.length > 0 ? "Recent notices" : "All notices"}
                  </CardTitle>
                </div>
                <span className="text-muted-foreground text-sm">
                  {regularNotices.length} notice{regularNotices.length !== 1 ? "s" : ""}
                </span>
              </CardHeader>
              <CardContent className="flex p-0 flex-col">
                {regularNotices.map((n, i) => (
                  <Link
                    key={n.id}
                    to={`/notices/${n.id}`}
                    className={`flex py-4 items-center gap-4 hover:bg-accent/30 rounded-lg px-2 transition-colors ${i < regularNotices.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <span
                      className={`rounded-full ${NOTICE_DOTS[i % NOTICE_DOTS.length]} shrink-0 size-2.5`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm line-clamp-2 [overflow-wrap:anywhere]">
                          {n.title}
                        </h3>
                        {n.externalUrl && (
                          <Badge variant="outline" className="rounded-full text-[10px] gap-1">
                            <ExternalLink className="size-3" />
                            Link
                          </Badge>
                        )}
                      </div>
                      <DescriptionPreview
                        text={n.description}
                        lines={2}
                        className="mt-0.5 text-xs"
                      />
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {n.department}
                        <span className="px-1">•</span>
                        {formatDate(n.date)}
                        {(n.category as string) !== "other" && (
                          <>
                            <span className="px-1">•</span>
                            <span className="capitalize">{n.category}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
