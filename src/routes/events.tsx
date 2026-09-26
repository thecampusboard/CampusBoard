import { Link } from "react-router-dom";
import { ChevronRight, Clock, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { formatEventTimeRange, publicEvents } from "@/lib/data";

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

function dateBlock(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: d.getDate().toString().padStart(2, "0"),
    month: d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
    weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
  };
}

export function withinDays(iso: string, days: number) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diff = (d.getTime() - now.getTime()) / 86_400_000;
  return diff >= 0 && diff <= days;
}

const WHEN_FILTERS = ["All", "This week", "This month", "Past"] as const;

export default function EventsPage() {
  usePageMeta(
    "Campus Events — CampusBoard",
    "Fests, workshops, talks and competitions happening across campus.",
  );

  const { events, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");
  const [when, setWhen] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return publicEvents(events)
      .filter((e) => {
        if (when === "This week") return withinDays(e.date, 7);
        if (when === "This month") return withinDays(e.date, 31);
        if (when === "Past") return (e.endDate ?? e.date) < today;
        return true;
      })
      .filter((e) =>
        q
          ? `${e.title} ${e.organizer} ${e.venue} ${e.description}`.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, query, when]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-bold uppercase text-violet-600 text-xs tracking-[0.22em]">
            Campus Calendar
          </p>
          <h1 className="font-bold text-foreground text-3xl sm:text-4xl tracking-tight">
            Events
          </h1>
          <p className="text-muted-foreground text-base">
            Discover talks, festivals, workshops and student activities
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <Card className="shadow-bento rounded-xl border-border p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="-translate-y-1/2 text-muted-foreground absolute top-1/2 left-3 size-4" />
            <input
              placeholder="Search events"
              className="w-full rounded-lg border border-border bg-background pl-10 pr-4 h-11 text-sm outline-none focus:ring-2 focus:ring-primary"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search events"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-muted-foreground text-sm mr-2">Filter by</span>
          {WHEN_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setWhen(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                when === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {/* Results */}
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-foreground text-xl">
          {when === "Past" ? "Past events" : "Upcoming events"}
        </h2>
        <span className="text-muted-foreground text-sm">
          Showing {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && publicEvents(events).length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading events…
          </div>
        </div>
      ) : error && publicEvents(events).length === 0 ? (
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
          <h3 className="font-semibold text-foreground text-lg">No events found</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Try adjusting your search or filters.
          </p>
          {(query || when !== "All") && (
            <button
              type="button"
              onClick={() => { setQuery(""); setWhen("All"); }}
              className="mt-4 inline-flex h-9 items-center rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-accent"
            >
              Clear filters
            </button>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((e) => {
            const { day, month, weekday } = dateBlock(e.date);
            const accent: { bg: string; text: string } = ACCENT_COLORS[e.accent as keyof typeof ACCENT_COLORS] ?? { bg: "bg-violet-50", text: "text-violet-600" };
            const timeRange = formatEventTimeRange(e);
            return (
              <Link key={e.id} to={`/events/${e.id}`}>
                <Card className="shadow-bento rounded-xl bg-card border-border flex p-4 flex-row gap-5 hover:shadow-md transition-shadow">
                  <div className={`text-center rounded-lg ${accent!.bg} flex p-2 flex-col justify-center items-center shrink-0 w-20`}>
                    <span className={`font-bold uppercase ${accent!.text} text-xs`}>{month}</span>
                    <span className="font-bold text-foreground text-3xl">{day}</span>
                    <span className="text-muted-foreground text-xs">{weekday}</span>
                  </div>
                  <CardContent className="flex p-0 flex-col flex-1 gap-2 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className={`font-semibold uppercase ${accent!.text} text-xs tracking-wide`}>
                          {e.organizer.length > 30 ? e.organizer.slice(0, 30) + "…" : e.organizer}
                        </span>
                        <h3 className="font-semibold text-foreground text-lg truncate">
                          {e.title}
                        </h3>
                      </div>
                      <ChevronRight className="text-muted-foreground mt-1 size-5 shrink-0" />
                    </div>
                    <div className="text-muted-foreground text-sm flex items-center gap-5 flex-wrap">
                      {timeRange && (
                        <span className="flex items-center gap-2">
                          <Clock className={`${accent!.text} size-4`} />
                          {timeRange}
                        </span>
                      )}
                      {e.venue && (
                        <span className="flex items-center gap-2">
                          <MapPin className={`${accent!.text} size-4`} />
                          {e.venue}
                        </span>
                      )}
                    </div>
                    {e.featured && (
                      <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary text-[10px] w-fit">
                        Featured
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
