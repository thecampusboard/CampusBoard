import { Link } from "react-router-dom";
import { Briefcase, Calendar, ChevronRight, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContent } from "@/lib/content";
import { OPPORTUNITY_TYPES, formatDate, publicOpportunities } from "@/lib/data";
import { usePageMeta } from "@/lib/seo";

const TYPE_LABELS: Record<string, string> = {
  all: "All types",
  internship: "Internship",
  job: "Job",
  hackathon: "Hackathon",
  research: "Research",
  fellowship: "Fellowship",
  competition: "Competition",
  other: "Other",
};

const ACCENT_COLORS: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  sky: { bg: "bg-sky-50", text: "text-sky-600" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-600" },
  yellow: { bg: "bg-amber-50", text: "text-amber-600" },
  purple: { bg: "bg-violet-50", text: "text-violet-600" },
  pink: { bg: "bg-pink-50", text: "text-pink-600" },
  navy: { bg: "bg-indigo-50", text: "text-indigo-600" },
};

export default function OpportunitiesPage() {
  usePageMeta(
    "Opportunities — CampusBoard",
    "Internships, jobs, hackathons, research and fellowships open to students.",
  );

  const { opportunities, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publicOpportunities(opportunities)
      .filter((o) => (type !== "all" ? o.type === type : true))
      .filter((o) =>
        q
          ? `${o.title} ${o.organization} ${o.position} ${o.skills.join(" ")}`
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [opportunities, query, type]);

  const today = new Date().toISOString().slice(0, 10);
  const activeOpps = useMemo(() => filtered.filter((o) => o.deadline >= today), [filtered, today]);
  const expiredOpps = useMemo(() => filtered.filter((o) => o.deadline < today), [filtered, today]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <p className="font-bold uppercase text-amber-600 text-xs tracking-[0.22em]">
          Career & Growth
        </p>
        <h1 className="font-bold text-foreground text-3xl sm:text-4xl tracking-tight">
          Opportunities
        </h1>
        <p className="text-muted-foreground text-base">
          Internships, jobs, hackathons, research and fellowships open to students
        </p>
      </div>

      {/* Search */}
      <div className="shadow-bento rounded-xl bg-card border border-border flex px-5 items-center gap-3 h-14">
        <Search className="text-primary size-5 shrink-0" />
        <input
          placeholder="Search by title, organization, or skills…"
          className="bg-transparent text-foreground text-sm border-none outline-none h-full flex-1 min-w-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search opportunities"
        />
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <Tabs value={type} onValueChange={setType}>
          <TabsList className="rounded-full bg-secondary/60 p-1 gap-1 h-10 flex-wrap">
            {["all", ...OPPORTUNITY_TYPES].map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="rounded-full px-4 text-sm capitalize"
              >
                {TYPE_LABELS[t] ?? t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span className="text-muted-foreground text-sm shrink-0">
          {filtered.length} opportunit{filtered.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      {/* Results */}
      {loading && publicOpportunities(opportunities).length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading opportunities…
          </div>
        </div>
      ) : error && publicOpportunities(opportunities).length === 0 ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <button type="button" onClick={refresh} className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Try again
          </button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <h3 className="font-semibold text-foreground text-lg">No opportunities found</h3>
          <p className="text-muted-foreground text-sm mt-2">Try different search or filters.</p>
          {(query || type !== "all") && (
            <button
              type="button"
              onClick={() => { setQuery(""); setType("all"); }}
              className="mt-4 inline-flex h-9 items-center rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              Clear filters
            </button>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {activeOpps.map((o) => {
            const accent: { bg: string; text: string } = ACCENT_COLORS[o.accent as keyof typeof ACCENT_COLORS] ?? { bg: "bg-violet-50", text: "text-violet-600" };
            return (
              <Link key={o.id} to={`/opportunities/${o.id}`}>
                <Card className="shadow-bento rounded-xl bg-card border-border p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl ${accent!.bg} ${accent!.text} flex justify-center items-center size-12 shrink-0`}>
                      <Briefcase className="size-5" />
                    </div>
                    <CardContent className="flex p-0 flex-col flex-1 gap-2 min-w-0">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className={`rounded-full ${accent!.bg} ${accent!.text} text-[10px] capitalize`}>
                              {o.type}
                            </Badge>
                            {o.featured && (
                              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary text-[10px]">
                                Featured
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground text-lg mt-1 truncate">{o.title}</h3>
                          <p className="text-muted-foreground text-sm">{o.organization} · {o.position}</p>
                        </div>
                        <ChevronRight className="text-muted-foreground size-5 shrink-0 mt-2" />
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground text-xs flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {o.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          Deadline: {formatDate(o.deadline)}
                        </span>
                        {o.stipend && <span className="font-medium text-emerald-600">{o.stipend}</span>}
                      </div>
                      {o.skills.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-1">
                          {o.skills.slice(0, 4).map((s) => (
                            <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                              {s}
                            </span>
                          ))}
                          {o.skills.length > 4 && (
                            <span className="text-muted-foreground text-[10px]">+{o.skills.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              </Link>
            );
          })}
          {expiredOpps.length > 0 && (
            <>
              <h3 className="font-semibold text-muted-foreground text-sm mt-4">Past deadlines</h3>
              {expiredOpps.map((o) => (
                <Link key={o.id} to={`/opportunities/${o.id}`}>
                  <Card className="shadow-bento rounded-xl bg-card border-border p-4 opacity-60 hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-3">
                      <Briefcase className="text-muted-foreground size-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">{o.title}</h3>
                        <p className="text-muted-foreground text-xs">{o.organization} · Deadline: {formatDate(o.deadline)}</p>
                      </div>
                      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
