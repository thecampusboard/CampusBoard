import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Users, Megaphone, History, Link2 } from "lucide-react";

import { useContent } from "@/lib/content";
import { formatDate, formatEventTimeRange, publicNotices, publicEvents } from "@/lib/data";
import { isValidHttpUrl } from "@/lib/utils";
import { usePageMeta } from "@/lib/seo";
import { logEvent } from "@/lib/analytics";
import { publicStorageUrl } from "@/lib/supabase";
import { clubIcon, noticeIcon } from "@/lib/icons";
import { ImageGallery } from "@/components/image-gallery";

export default function ClubDetail() {
  const { clubId } = useParams<{ clubId: string }>();
  const { clubs, events, notices } = useContent();
  const club = clubs.find((c) => c.id === clubId);

  usePageMeta(
    club ? `${club.name} — CampusBoard` : "Club — CampusBoard",
    "Club profile, recruitment info and upcoming events.",
  );

  useEffect(() => {
    if (club) logEvent("club", club.id, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id]);

  if (!club) {
    return (
      <div className="bento p-8">
        <h1 className="text-2xl font-extrabold">Club not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This club may have been removed or the link is incorrect.
        </p>
        <Link to="/clubs" className="pt-3 inline-block text-sm font-bold underline">
          Back to clubs
        </Link>
      </div>
    );
  }

  const Icon = clubIcon(club.id);
  const today = new Date().toISOString().slice(0, 10);
  const allClubEvents = publicEvents(events).filter((e) => e.clubId === club.id);
  const upcomingEvents = allClubEvents
    .filter((e) => (e.endDate ?? e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const recordedPastEvents = allClubEvents.filter((e) => (e.endDate ?? e.date) < today);
  // Only approved notices are ever public — this mirrors publicNotices()
  // used everywhere else a notice list is shown to a general visitor.
  const clubNotices = publicNotices(notices).filter((n) => n.clubId === club.id);

  return (
    <article className="bento p-6 sm:p-8">
      {club.gallery.length > 0 ? (
        <ImageGallery
          images={club.gallery.map((path) => publicStorageUrl("content-images", path))}
          alt={`${club.name} gallery`}
          aspect="aspect-[16/9]"
          autoPlay
          className="mb-6"
        />
      ) : null}

      <div className="flex items-start gap-4">
        {club.imagePath ? (
          <img
            src={publicStorageUrl("content-images", club.imagePath)}
            alt=""
            className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-navy/10"
          />
        ) : (
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-purple/25 text-navy ring-1 ring-navy/10"
            aria-hidden="true"
          >
            <Icon className="size-7" strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold">{club.name}</h1>
          <p className="pt-1 text-sm font-semibold text-muted-foreground">{club.tagline}</p>
        </div>
      </div>

      <p className="pt-4 text-base leading-relaxed">{club.about}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 pt-3">
        {club.members > 0 ? (
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 shrink-0" aria-hidden="true" />
            {club.members} members{club.founded ? ` · Founded ${club.founded}` : ""}
          </p>
        ) : null}
        {club.recruitment ? (
          <p className="text-sm font-semibold">Recruitment: {club.recruitment}</p>
        ) : null}
      </div>

      {club.socials.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-4">
          {club.socials
            .filter((s) => isValidHttpUrl(s.url))
            .map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold transition-colors hover:bg-accent"
              >
                <Link2 className="size-3.5" aria-hidden="true" />
                {s.label}
              </a>
            ))}
        </div>
      ) : null}

      {club.announcements.length > 0 ? (
        <section className="pt-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Megaphone className="size-4 shrink-0" aria-hidden="true" />
            Announcements
          </h2>
          <ul className="mt-2 space-y-2">
            {club.announcements.map((a, i) => (
              <li key={i} className="rounded-xl bg-muted/40 p-3 text-sm leading-relaxed">
                {a}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <section className="pt-6">
          <h2 className="text-lg font-bold">Upcoming events</h2>
          <ul className="pt-2 space-y-1">
            {upcomingEvents.map((e) => (
              <li key={e.id} className="text-sm">
                <Link to={`/events/${e.id}`} className="font-semibold underline">
                  {e.title}
                </Link>{" "}
                — {formatDate(e.date)}
                {formatEventTimeRange(e) ? ` · ${formatEventTimeRange(e)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {club.pastEvents.length > 0 || recordedPastEvents.length > 0 ? (
        <section className="pt-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <History className="size-4 shrink-0" aria-hidden="true" />
            Past events
          </h2>
          <ul className="pt-2 space-y-1">
            {recordedPastEvents.map((e) => (
              <li key={e.id} className="text-sm">
                <Link to={`/events/${e.id}`} className="font-semibold underline">
                  {e.title}
                </Link>{" "}
                — {formatDate(e.date)}
              </li>
            ))}
            {club.pastEvents.map((e, i) => (
              <li key={`legacy-${i}`} className="text-sm text-muted-foreground">
                {e.title} — {formatDate(e.date)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {clubNotices.length > 0 ? (
        <section className="pt-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Megaphone className="size-4 shrink-0" aria-hidden="true" />
            Club notices
          </h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {clubNotices.map((n) => {
              const NIcon = noticeIcon(n.category);
              return (
                <li key={n.id}>
                  <Link
                    to={`/notices/${n.id}`}
                    className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange/20 text-navy"
                      aria-hidden="true"
                    >
                      <NIcon className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{n.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(n.date)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Link to="/clubs" className="mt-6 inline-block text-sm font-bold underline">
        Back to clubs
      </Link>
    </article>
  );
}
