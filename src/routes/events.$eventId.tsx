import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Clock,
  GraduationCap,
  MapPin,
  Phone,
  Star,
  Users,
} from "lucide-react";

import { ProtectedAction } from "@/components/protected-action";
import { EngagementToggle } from "@/components/engagement-toggle";
import { useContent } from "@/lib/content";
import { formatDate, formatEventTimeRange } from "@/lib/data";
import { googleCalendarUrl } from "@/lib/auth";
import { usePageMeta } from "@/lib/seo";
import { logEvent } from "@/lib/analytics";
import { hasRealUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-foreground">
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, clubs, registeredEventIds, toggleEventRegistration } = useContent();
  const event = events.find((e) => e.id === eventId);
  const club = event?.clubId ? clubs.find((c) => c.id === event.clubId) : undefined;

  usePageMeta(
    event ? `${event.title} — CampusBoard` : "Event — CampusBoard",
    "Event details, venue, eligibility and registration.",
  );

  useEffect(() => {
    if (event) logEvent("event", event.id, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  if (!event) {
    return (
      <Card className="shadow-bento rounded-2xl border-border p-8">
        <h1 className="text-2xl font-bold text-foreground">Event not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This event may have been removed or the link is incorrect.
        </p>
        <Link
          to="/events"
          className="pt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to events
        </Link>
      </Card>
    );
  }

  const calendarUrl = googleCalendarUrl({
    title: event.title,
    date: event.date,
    details: event.description,
    location: event.venue,
    ...(event.time ? { time: event.time } : {}),
    ...(event.endDate ? { endDate: event.endDate } : {}),
    ...(event.startTime ? { startTime: event.startTime } : {}),
    ...(event.endTime ? { endTime: event.endTime } : {}),
  });

  const dateLabel =
    event.endDate && event.endDate !== event.date
      ? `${formatDate(event.date)} – ${formatDate(event.endDate)}`
      : formatDate(event.date);
  const deadlinePassed = event.registrationDeadline
    ? new Date(event.registrationDeadline + "T23:59:59") < new Date()
    : false;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to events
      </Link>
      <Card className="shadow-bento rounded-2xl border-border overflow-hidden">
        <div className="h-2 w-full bg-primary" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
              {event.organizer}
            </p>
            {event.featured && (
              <Badge variant="secondary" className="gap-1 rounded-full bg-primary/10 text-primary">
                <Star className="size-3 fill-current" aria-hidden="true" />
                Featured
              </Badge>
            )}
          </div>
          <h1 className="pt-2 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {event.title}
          </h1>
          {club && (
            <Link
              to={`/clubs/${club.id}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              <Users className="size-3.5" aria-hidden="true" />
              Hosted by {club.name}
            </Link>
          )}

          <div className="mt-6 grid gap-5 rounded-2xl bg-secondary/50 p-5 sm:grid-cols-2">
            <InfoRow
              icon={<Calendar className="size-4" aria-hidden="true" />}
              label="Date"
              value={dateLabel}
            />
            <InfoRow
              icon={<Clock className="size-4" aria-hidden="true" />}
              label="Time"
              value={formatEventTimeRange(event) || "To be announced"}
            />
            <InfoRow
              icon={<MapPin className="size-4" aria-hidden="true" />}
              label="Venue"
              value={event.venue}
            />
            <InfoRow
              icon={<GraduationCap className="size-4" aria-hidden="true" />}
              label="Eligibility"
              value={event.eligibility}
            />
            {event.registrationDeadline && (
              <InfoRow
                icon={<Calendar className="size-4" aria-hidden="true" />}
                label="Registration Deadline"
                value={
                  <span className={deadlinePassed ? "text-destructive" : undefined}>
                    {formatDate(event.registrationDeadline)}
                    {deadlinePassed ? " (closed)" : ""}
                  </span>
                }
              />
            )}
            {event.contact && (
              <InfoRow
                icon={<Phone className="size-4" aria-hidden="true" />}
                label="Contact"
                value={event.contact}
              />
            )}
          </div>

          <div className="pt-6">
            <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
              About this event
            </h2>
            <p className="pt-2 text-base leading-relaxed whitespace-pre-line text-foreground">
              {event.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-6">
            {hasRealUrl(event.registrationUrl) && !deadlinePassed ? (
              <ProtectedAction
                href={event.registrationUrl}
                label="Register Now"
                lockedLabel="Login to Register"
                onProceed={() => logEvent("event", event.id, "register_click")}
              />
            ) : deadlinePassed ? (
              <p className="text-sm font-semibold text-muted-foreground">
                Registration for this event has closed.
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">
                No registration link has been added yet.
              </p>
            )}
            <ProtectedAction
              href={calendarUrl}
              label="Add to Google Calendar"
              lockedLabel="Login to add to Calendar"
              variant="outline"
              icon={<CalendarPlus className="size-4" aria-hidden="true" />}
            />
            <EngagementToggle
              active={registeredEventIds.has(event.id)}
              onToggle={() => toggleEventRegistration(event.id)}
              icon={CalendarCheck}
              label="Register in My Dashboard"
              activeLabel="Registered"
              redirectTo={`/events/${event.id}`}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
