import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarHeart, CalendarPlus, Clock } from "lucide-react";

import { ProtectedAction } from "@/components/protected-action";
import { HolidayCalendar } from "@/components/holiday-calendar";
import { Card } from "@/components/ui/card";
import { googleCalendarUrl } from "@/lib/auth";
import { useContent } from "@/lib/content";
import { formatDate, formatEventTimeRange, formatShortDate, publicEvents } from "@/lib/data";
import { usePageMeta } from "@/lib/seo";

export default function CalendarPage() {
  usePageMeta(
    "Campus Calendar — CampusBoard",
    "Campus events, deadlines and college holidays in one calendar.",
  );

  const [tab, setTab] = useState<"events" | "holidays">("events");
  const { events, loading, error, refresh } = useContent();
  const today = new Date().toISOString().slice(0, 10);
  const sorted = publicEvents(events)
    .filter((event) => (event.endDate ?? event.date) >= today)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.startTime ?? a.time ?? "").localeCompare(b.startTime ?? b.time ?? ""),
    );

  return (
    <div className="space-y-5">
      <header className="shadow-bento rounded-2xl bg-card border border-border p-5 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.22em] text-primary uppercase">Calendar</p>
            <h1 className="pt-2 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Campus dates, all in one place
            </h1>
            <p className="max-w-2xl pt-2 text-sm leading-6 text-muted-foreground">
              Browse upcoming campus events and the official college holiday calendar.
            </p>
          </div>
        </div>

        <div
          className="mt-5 inline-flex w-full max-w-full overflow-x-auto rounded-xl border border-border bg-secondary p-1 sm:w-auto"
          role="tablist"
          aria-label="Calendar views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "events"}
            onClick={() => setTab("events")}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold whitespace-nowrap transition sm:flex-none sm:px-4 ${
              tab === "events"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Campus Calendar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "holidays"}
            onClick={() => setTab("holidays")}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold whitespace-nowrap transition sm:flex-none sm:px-4 ${
              tab === "holidays"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarHeart className="size-4" aria-hidden="true" />
            Holidays
          </button>
        </div>
      </header>

      {tab === "holidays" ? (
        <HolidayCalendar />
      ) : loading && sorted.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading calendar…
          </div>
        </div>
      ) : error && sorted.length === 0 ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <button type="button" onClick={refresh} className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Try again</button>
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="shadow-bento rounded-2xl border-border p-8 text-center">
          <h3 className="font-semibold text-foreground text-lg">No events on the calendar yet</h3>
          <p className="text-muted-foreground text-sm mt-2">Check back soon for upcoming campus dates.</p>
        </Card>
      ) : (
        <Card className="shadow-bento rounded-2xl border-border divide-y divide-border p-2">
          {sorted.map((e) => {
            const calendarUrl = googleCalendarUrl({
              title: e.title,
              date: e.date,
              details: e.description,
              location: e.venue,
              ...(e.time ? { time: e.time } : {}),
              ...(e.endDate ? { endDate: e.endDate } : {}),
              ...(e.startTime ? { startTime: e.startTime } : {}),
              ...(e.endTime ? { endTime: e.endTime } : {}),
            });
            const dateRange =
              e.endDate && e.endDate !== e.date
                ? `${formatShortDate(e.date)} – ${formatDate(e.endDate)}`
                : formatDate(e.date);
            return (
              <li
                key={e.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <Link
                  to={`/events/${e.id}`}
                  className="grid min-w-0 flex-1 gap-x-4 gap-y-1 rounded-xl p-2 transition-colors hover:bg-accent md:grid-cols-[11.5rem_11rem_minmax(0,1fr)_10rem] md:items-center"
                >
                  <span className="flex items-center gap-2 text-sm font-bold sm:whitespace-nowrap">
                    <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                    {dateRange}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-primary sm:whitespace-nowrap">
                    <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                    {formatEventTimeRange(e)}
                  </span>
                  <span className="min-w-0 truncate text-sm font-semibold">{e.title}</span>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">{e.venue}</span>
                </Link>
                <ProtectedAction
                  href={calendarUrl}
                  label="Add to Calendar"
                  lockedLabel="Add to Calendar"
                  variant="outline"
                  icon={<CalendarPlus className="size-4" aria-hidden="true" />}
                  className="!min-h-9 shrink-0 self-start !px-3 !text-xs sm:self-center"
                />
              </li>
            );
          })}
        </Card>
      )}
    </div>
  );
}
