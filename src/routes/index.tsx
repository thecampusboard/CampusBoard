import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Search, Clock, MapPin, Heart, Star, ExternalLink } from "lucide-react";

import { Bento, BentoHeader, Tag, accentSolid } from "@/components/bento";
import { ImageGallery } from "@/components/image-gallery";
import { clubIcon, eventIcon, listingIcon, noticeIcon, opportunityIcon } from "@/lib/icons";
import {
  CAMPUS_STAT_TILES,
  campusStats,
  publicListings,
  publicNotices,
  formatDate,
  formatEventTimeRange,
  formatPrice,
  formatShortDate,
} from "@/lib/data";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { publicStorageUrl } from "@/lib/supabase";
import campusImage from "@/assets/campus.jpg";

export default function Home() {
  usePageMeta(
    "CampusBoard — All Campus Updates, One Place.",
    "Everything happening on campus: official notices, events and fests, clubs, internships and opportunities, calendar and campus buy & sell.",
  );

  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const {
    notices: allNotices,
    events: allEvents,
    clubs: allClubs,
    opportunities: allOpportunities,
    listings: allListings,
    appearance,
  } = useContent();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...allEvents]
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const notices = [...publicNotices(allNotices)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const opportunities = [...allOpportunities]
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);
  const listings = publicListings(allListings).slice(0, 4);

  // Real "happening today" list — replaces a previously-hardcoded fixed
  // schedule. Sorted by structured startTime where the event has one (24hr
  // "HH:MM" sorts correctly as a string); falls back to date-insertion
  // order for any legacy row that only has the old free-text time, rather
  // than dropping it.
  const todaySchedule = allEvents
    .filter((e) => e.date <= today && (e.endDate ?? e.date) >= today)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const stats = campusStats({
    notices: allNotices,
    events: allEvents,
    clubs: allClubs,
    opportunities: allOpportunities,
    listings: allListings,
  });

  const heroImageUrl = appearance.heroImagePath
    ? publicStorageUrl("content-images", appearance.heroImagePath)
    : campusImage;
  const heroRenderUrl = heroImageFailed ? campusImage : heroImageUrl;

  useEffect(() => {
    setHeroImageFailed(false);
  }, [appearance.heroImagePath]);
  const campusGalleryUrls =
    appearance.campusGalleryPaths.length > 0
      ? appearance.campusGalleryPaths.map((p) => publicStorageUrl("content-images", p))
      : [campusImage];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* HERO ROW ------------------------------------------------------- */}
      <section className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <Bento
          accent="navy"
          hover={false}
          className="relative overflow-hidden p-6 sm:p-8 lg:col-span-7"
        >
          <img
            key={heroRenderUrl}
            src={heroRenderUrl}
            alt=""
            aria-hidden="true"
            onError={() => setHeroImageFailed(true)}
            className="absolute inset-0 size-full object-cover opacity-45"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-navy/80 via-navy/55 to-navy/20"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.08),transparent_38%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-xs font-bold tracking-[0.18em] text-sky uppercase">
              All campus updates, one place
            </p>
            <h1 className="pt-4 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
              Everything happening
              <br />
              on campus. <span className="text-sky">One place.</span>
            </h1>
            <p className="max-w-lg pt-4 text-sm text-navy-foreground/75 sm:text-base">
              Notices, Events, Internships and more — all in one place.
            </p>

            <form
              className="pt-6"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/search?q=${encodeURIComponent(q)}`);
              }}
            >
              <label htmlFor="hero-search" className="sr-only">
                Search CampusBoard
              </label>
              <div className="flex items-center gap-2 rounded-2xl bg-card p-2 pl-4 transition-shadow focus-within:ring-2 focus-within:ring-sky">
                <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  id="hero-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search notices, events, clubs, internships and more..."
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-navy-foreground transition hover:bg-navy/90 active:scale-95"
                  aria-label="Search"
                >
                  <ArrowRight className="size-5" aria-hidden="true" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap gap-3 pt-6">
              <Link
                to="/events"
                className="inline-flex min-h-11 items-center rounded-xl bg-sky px-5 text-sm font-bold text-navy transition-transform active:scale-95"
              >
                Explore Campus
              </Link>
              <Link
                to="/notices"
                className="inline-flex min-h-11 items-center rounded-xl border border-navy-foreground/30 px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy-foreground/10"
              >
                View Notices
              </Link>
            </div>
          </div>
        </Bento>

        <div className="grid gap-4 sm:gap-5 lg:col-span-5">
          <Bento className="overflow-hidden p-0" hover={false}>
            <div className="relative">
              <ImageGallery
                images={campusGalleryUrls}
                alt="Our Campus"
                aspect="aspect-[16/9]"
                className="!rounded-none"
                autoPlay={campusGalleryUrls.length > 1}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-navy/85 to-transparent px-4 pt-8 pb-7">
                <p className="text-lg font-extrabold text-navy-foreground">UPES</p>
                <Heart className="size-5 text-pink" aria-hidden="true" />
              </div>
            </div>
          </Bento>

          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {CAMPUS_STAT_TILES.map((tile) => (
              <Bento key={tile.key} accent={tile.accent} className="p-4 sm:p-5">
                <p className="text-3xl font-extrabold text-navy sm:text-4xl">{stats[tile.key]}</p>
                <p className="pt-1 text-xs font-bold text-navy/70 uppercase">{tile.label}</p>
              </Bento>
            ))}
          </div>
        </div>
      </section>

      {/* TODAY + NOTICES ------------------------------------------------ */}
      <section className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <Bento accent="navy" hover={false} className="lg:col-span-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-4">
            <h2 className="min-w-0 text-xl font-extrabold">
              Today
              <br />
              on Campus
            </h2>
            <Link to="/calendar" className="shrink-0 text-sm font-semibold text-sky">
              View all →
            </Link>
          </div>
          {todaySchedule.length === 0 ? (
            <p className="py-3 text-sm font-semibold text-navy-foreground/70">
              Nothing on the schedule for today.
            </p>
          ) : (
            <ul className="divide-y divide-navy-foreground/15">
              {todaySchedule.map((e) => (
                <li key={e.id} className="py-3">
                  <Link
                    to={`/events/${e.id}`}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg transition-opacity hover:opacity-80"
                  >
                    <span className="shrink-0 pt-0.5 text-xs font-bold text-sky">
                      {formatEventTimeRange(e)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-navy-foreground">
                        {e.title}
                      </span>
                      <span className="block truncate text-xs text-navy-foreground/65">
                        {e.venue}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/calendar"
            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-sky"
          >
            View Calendar <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Bento>

        <Bento accent="orange" hover={false} className="lg:col-span-7">
          <BentoHeader title="Important Notices" action={{ label: "View All", to: "/notices" }} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {notices.map((n) => {
              const Icon = noticeIcon(n.category);
              return (
                <li key={n.id}>
                  <Link
                    to={`/notices/${n.id}`}
                    className="grid h-full grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl bg-card/70 p-4 transition-colors hover:bg-card"
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange/25 text-navy ring-1 ring-navy/10"
                      aria-hidden="true"
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 pb-1.5">
                        <Tag accent="orange">{n.category}</Tag>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {n.fileType}
                        </span>
                        {n.externalUrl ? (
                          <ExternalLink
                            className="size-3.5 text-navy/60"
                            aria-label="External link"
                          />
                        ) : null}
                      </span>
                      <span className="block text-sm font-bold">{n.title}</span>
                      <span className="block pt-1 text-xs text-muted-foreground">
                        {formatDate(n.date)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Bento>
      </section>

      {/* EVENTS + OPPORTUNITIES ----------------------------------------- */}
      <section className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <Bento accent="green" hover={false} className="lg:col-span-7">
          <BentoHeader title="Upcoming Events" action={{ label: "View All", to: "/events" }} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {upcoming.map((e) => {
              const Icon = eventIcon(e.id);
              return (
                <li key={e.id}>
                  <Link
                    to={`/events/${e.id}`}
                    className="flex h-full flex-col rounded-xl bg-card/75 p-4 transition-colors hover:bg-card"
                  >
                    {e.featured ? (
                      <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-yellow/30 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-navy">
                        <Star className="size-3 fill-current" aria-hidden="true" />
                        Featured
                      </span>
                    ) : null}
                    <span
                      className={`mb-3 grid size-11 place-items-center rounded-xl ${accentSolid[e.accent]} text-navy ring-1 ring-navy/10`}
                      aria-hidden="true"
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="text-sm font-bold">{e.title}</span>
                    <span className="pt-1 text-xs font-semibold text-muted-foreground">
                      {formatShortDate(e.date)}
                      {e.endDate ? `–${formatShortDate(e.endDate)}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">{e.venue}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Bento>

        <Bento accent="purple" hover={false} className="lg:col-span-5">
          <BentoHeader
            title="Latest Opportunities"
            action={{ label: "View All", to: "/opportunities" }}
          />
          <ul className="space-y-3">
            {opportunities.map((o) => {
              const Icon = opportunityIcon(o.type);
              return (
                <li key={o.id}>
                  <Link
                    to={`/opportunities/${o.id}`}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl bg-card/75 p-4 transition-colors hover:bg-card"
                  >
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple/30 text-navy ring-1 ring-navy/10"
                      aria-hidden="true"
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{o.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {o.position}
                      </span>
                      <span className="block pt-1 text-xs font-semibold text-navy">
                        Deadline: {formatDate(o.deadline)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Bento>
      </section>

      {/* CLUBS + BUY & SELL --------------------------------------------- */}
      <section className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <Bento accent="purple" hover={false} className="lg:col-span-5">
          <BentoHeader
            title="Clubs & Societies"
            action={{ label: "Explore Clubs", to: "/clubs" }}
          />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allClubs.map((c) => {
              const Icon = clubIcon(c.id);
              return (
                <li key={c.id}>
                  <Link
                    to={`/clubs/${c.id}`}
                    className="flex h-full flex-col items-start rounded-xl bg-card/75 p-3 transition-colors hover:bg-card"
                  >
                    {c.imagePath ? (
                      <img
                        src={publicStorageUrl("content-images", c.imagePath)}
                        alt=""
                        className="mb-2 size-10 rounded-xl object-cover ring-1 ring-navy/10"
                      />
                    ) : (
                      <span
                        className={`mb-2 grid size-10 place-items-center rounded-xl ${accentSolid[c.accent]} text-navy ring-1 ring-navy/10`}
                        aria-hidden="true"
                      >
                        <Icon className="size-5" strokeWidth={1.75} />
                      </span>
                    )}
                    <span className="text-xs font-bold">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.tagline}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Bento>

        <Bento accent="yellow" hover={false} className="lg:col-span-7">
          <BentoHeader title="Buy & Sell" action={{ label: "View Marketplace", to: "/buy-sell" }} />
          <p className="-mt-2 pb-3 text-xs font-semibold text-navy/70">
            Login to view seller contact →
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {listings.map((l) => {
              const Icon = listingIcon(l.id, l.category);
              return (
                <li key={l.id}>
                  <Link
                    to="/buy-sell"
                    className="flex h-full flex-col rounded-xl bg-card/80 p-4 transition-colors hover:bg-card"
                  >
                    <span
                      className={`mb-3 grid size-11 place-items-center rounded-xl ${accentSolid[l.accent]} text-navy ring-1 ring-navy/10`}
                      aria-hidden="true"
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="text-sm font-bold">{l.title}</span>
                    <span className="pt-1 text-sm font-extrabold text-navy">
                      {formatPrice(l.price)}
                    </span>
                    <span className="text-xs text-muted-foreground">{l.condition}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Bento>
      </section>

      {/* SMALL UTILITY ROW ---------------------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <Bento accent="sky" className="flex items-center gap-3">
          <Clock className="size-5 shrink-0 text-navy" aria-hidden="true" />
          <p className="min-w-0 text-sm font-bold text-navy">
            See what's happening today on the campus calendar.
          </p>
        </Bento>
        <Bento accent="blue" className="flex items-center gap-3">
          <MapPin className="size-5 shrink-0 text-navy" aria-hidden="true" />
          <p className="min-w-0 text-sm font-bold text-navy">
            Find internships and opportunities before the deadline.
          </p>
        </Bento>
        <Bento accent="pink" className="flex items-center gap-3">
          <Heart className="size-5 shrink-0 text-navy" aria-hidden="true" />
          <p className="min-w-0 text-sm font-bold text-navy">
            Explore clubs and join something new this semester.
          </p>
        </Bento>
      </section>
    </div>
  );
}
