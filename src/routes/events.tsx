import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { ChipFilter, ResultCount, SearchField } from "@/components/filters";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { formatDate, formatEventTimeRange, publicEvents } from "@/lib/data";
import { eventIcon } from "@/lib/icons";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/bento";

const WHEN = ["This week", "This month", "Past"] as const;

export function withinDays(iso: string, days: number) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diff = (d.getTime() - now.getTime()) / 86_400_000;
  return diff >= 0 && diff <= days;
}

export default function EventsPage() {
  usePageMeta(
    "Campus Events — CampusBoard",
    "Fests, workshops, talks and competitions happening across campus.",
  );

  const { events, loading, error, refresh } = useContent();
  const [query, setQuery] = useState("");
  const [when, setWhen] = useState<string | null>(null);

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
    <div className="space-y-5">
      <header className="bento p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          Events
        </p>
        <h1 className="pt-2 text-3xl font-extrabold sm:text-4xl">What's happening on campus</h1>
      </header>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search events, organizers, venues…"
        label="Search events"
      />
      <ChipFilter
        options={WHEN}
        value={when}
        onChange={setWhen}
        allLabel="All dates"
        label="Filter events by date"
      />
      <ResultCount count={filtered.length} noun="event" />

      {loading && events.length === 0 ? (
        <SkeletonGrid />
      ) : error && events.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events found"
          hint="Try another date range or search."
          action={
            (query || when) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setWhen(null);
                }}
                className="inline-flex min-h-9 items-center rounded-full border border-foreground/20 bg-card px-4 text-xs font-bold hover:bg-accent"
              >
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((e) => {
            const Icon = eventIcon(e.id);
            return (
              <li key={e.id}>
                <Link
                  to={`/events/${e.id}`}
                  className="bento bento-hover grid h-full grid-cols-[auto_minmax(0,1fr)] gap-4 p-5"
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-green/25 text-navy ring-1 ring-navy/10"
                    aria-hidden="true"
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    {e.featured ? (
                      <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-yellow/30 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-navy">
                        <Star className="size-3 fill-current" aria-hidden="true" />
                        Featured
                      </span>
                    ) : null}
                    <span className="block text-lg font-bold">{e.title}</span>
                    <span className="block pt-1 text-sm text-muted-foreground">{e.organizer}</span>
                    <span className="flex items-center gap-2 pt-3 text-xs font-semibold">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {formatDate(e.date)} · {formatEventTimeRange(e)}
                    </span>
                    <span className="flex items-center gap-2 pt-1 text-xs font-semibold">
                      <MapPin className="size-4" aria-hidden="true" />
                      {e.venue}
                    </span>
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
