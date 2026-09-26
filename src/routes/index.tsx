import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Bus,
  CalendarDays,
  ChevronRight,
  Compass,
  FileText,
  GraduationCap,
  Layers,
  MapPin,
  Phone,
  Search,
  Star,
  Users,
  Utensils,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  campusStats,
  publicNotices,
  publicEvents,
  publicOpportunities,
  publicClubs,
  formatDate,
  formatShortDate,
  formatTime12h,
} from "@/lib/data";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { publicStorageUrl } from "@/lib/supabase";
import campusImage from "@/assets/campus.jpg";

/** Centralized Quick Links config — easy to update without digging through JSX */
const QUICK_LINKS = [
  {
    label: "Academic Portal",
    icon: GraduationCap,
    href: "https://myupes-beta.upes.ac.in/oneportal/app/auth/login",
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconColor: "text-primary",
    chevronColor: "text-primary",
  },
  {
    label: "Food Court",
    icon: Utensils,
    href: "#",
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconColor: "text-amber-600",
    chevronColor: "text-muted-foreground",
  },
  {
    label: "Transport",
    icon: Bus,
    href: "#",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconColor: "text-emerald-600",
    chevronColor: "text-muted-foreground",
  },
  {
    label: "Findit: Lost & Found",
    icon: FileText,
    href: "https://campus-findit-gamma.vercel.app/",
    bg: "bg-violet-50",
    border: "border-violet-100",
    iconColor: "text-violet-600",
    chevronColor: "text-muted-foreground",
  },
  {
    label: "Library",
    icon: BookOpen,
    href: "https://library.ddn.upes.ac.in/",
    bg: "bg-orange-50",
    border: "border-orange-100",
    iconColor: "text-orange-600",
    chevronColor: "text-muted-foreground",
  },
  {
    label: "Helpline",
    icon: Phone,
    href: "#",
    bg: "bg-teal-50",
    border: "border-teal-100",
    iconColor: "text-teal-600",
    chevronColor: "text-muted-foreground",
  },
];

const STAT_TILES = [
  {
    key: "eventsToday" as const,
    label: "Events Today",
    icon: CalendarDays,
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconColor: "text-primary",
    chevronColor: "text-primary",
  },
  {
    key: "notices" as const,
    label: "Notices",
    icon: Bell,
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconColor: "text-amber-500",
    chevronColor: "text-amber-500",
  },
  {
    key: "opportunities" as const,
    label: "Open Opportunities",
    icon: Users,
    bg: "bg-violet-50",
    border: "border-violet-100",
    iconColor: "text-violet-600",
    chevronColor: "text-violet-600",
  },
  {
    key: "clubs" as const,
    label: "Active Clubs",
    icon: Star,
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconColor: "text-emerald-600",
    chevronColor: "text-emerald-600",
  },
];

const STAT_LINKS: Record<string, string> = {
  eventsToday: "/events",
  notices: "/notices",
  opportunities: "/opportunities",
  clubs: "/clubs",
};

/** Format event time range for today-on-campus display */
function formatTimeRange(e: { startTime?: string; endTime?: string; time?: string }): string {
  if (e.startTime) {
    const start = formatTime12h(e.startTime);
    const end = e.endTime ? formatTime12h(e.endTime) : "";
    return end ? `${start}–${end}` : start;
  }
  return e.time || "All day";
}

const NOTICE_DOTS = ["bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-violet-500"];

export default function Home() {
  usePageMeta(
    "CampusBoard — All Campus Updates, One Place.",
    "Everything happening on campus: official notices, events and fests, clubs, internships and opportunities.",
  );

  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const {
    notices: allNotices,
    events: allEvents,
    clubs: allClubs,
    chapters: allChapters,
    opportunities: allOpportunities,
    listings: allListings,
    appearance,
    loading,
  } = useContent();

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(
    () =>
      campusStats({
        notices: allNotices,
        events: allEvents,
        clubs: allClubs,
        chapters: allChapters,
        opportunities: allOpportunities,
        listings: allListings,
      }),
    [allNotices, allEvents, allClubs, allChapters, allOpportunities, allListings],
  );

  const notices = useMemo(
    () => [...publicNotices(allNotices)].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    [allNotices],
  );

  const todaySchedule = useMemo(
    () =>
      publicEvents(allEvents)
        .filter((e) => e.date <= today && (e.endDate ?? e.date) >= today)
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
        .slice(0, 4),
    [allEvents, today],
  );

  const upcomingEvents = useMemo(
    () =>
      publicEvents(allEvents)
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4),
    [allEvents, today],
  );

  const opportunities = useMemo(
    () =>
      publicOpportunities(allOpportunities)
        .filter((o) => o.deadline >= today)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 3),
    [allOpportunities, today],
  );

  const clubs = useMemo(() => publicClubs(allClubs).slice(0, 4), [allClubs]);
  const chapters = useMemo(() => allChapters.slice(0, 4), [allChapters]);

  const heroImageUrl = appearance.heroImagePath
    ? publicStorageUrl("content-images", appearance.heroImagePath)
    : campusImage;
  const heroRenderUrl = heroImageFailed ? campusImage : heroImageUrl;

  useEffect(() => {
    setHeroImageFailed(false);
  }, [heroImageUrl]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading campus updates…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Hero ─── */}
      <section className="shadow-bento rounded-2xl border border-border relative flex items-center min-h-[300px] sm:min-h-[330px] overflow-hidden">
        <img
          src={heroRenderUrl}
          alt="Campus view"
          className="absolute inset-0 size-full object-cover"
          onError={() => setHeroImageFailed(true)}
        />
        <div className="absolute inset-0 bg-[oklch(0.12_0.08_255/.86)] sm:bg-[linear-gradient(90deg,oklch(0.12_0.08_255/.96),oklch(0.12_0.08_255/.82)_38%,transparent_78%)]" />
        <div className="flex relative z-10 w-full p-5 sm:p-8 flex-col justify-center gap-4 max-w-[700px]">
          <div className="font-semibold text-cyan-300 text-[11px] sm:text-xs tracking-[0.14em] sm:tracking-[0.18em]">
            ALL CAMPUS UPDATES, ONE PLACE
          </div>
          <h1 className="font-bold text-white text-[1.75rem] leading-[1.1] sm:text-[40px] sm:leading-[1.05]">
            Everything happening on campus. <span className="text-cyan-300">One place.</span>
          </h1>
          <p className="text-white/85 text-sm">
            Notices, Events, Internships and more — all in one place.
          </p>
          <form
            onSubmit={handleSearch}
            className="shadow-bento rounded-full bg-white flex pr-4 pl-4 items-center gap-3 w-full max-w-[620px] h-11"
          >
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <input
              placeholder="Search notices, events, clubs…"
              aria-label="Search CampusBoard"
              className="bg-transparent text-foreground text-sm outline-none flex-1 min-w-0"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="rounded-full bg-primary text-primary-foreground flex justify-center items-center size-8 shrink-0"
            >
              <ArrowRight className="size-4" />
            </button>
          </form>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              className="rounded-full bg-primary pr-5 pl-5"
              onClick={() => navigate("/calendar")}
            >
              <Compass className="mr-2 size-4" />
              Explore Campus
            </Button>
            <Button
              variant="outline"
              className="rounded-full bg-transparent text-white border-white/70 pr-5 pl-5"
              onClick={() => navigate("/notices")}
            >
              <FileText className="mr-1 size-4" />
              View Notices
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Stat tiles ─── */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {STAT_TILES.map((tile) => (
          <Link
            key={tile.key}
            to={STAT_LINKS[tile.key] ?? "/"}
            className={`shadow-bento rounded-xl ${tile.bg} border ${tile.border} flex p-3 sm:p-4 justify-between items-center gap-2 hover:shadow-md transition-shadow`}
          >
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <tile.icon className={`${tile.iconColor} size-6 shrink-0`} aria-hidden="true" />
              <div className="min-w-0">
                <div className="font-bold text-2xl">{stats[tile.key]}</div>
                <div className="font-semibold uppercase text-muted-foreground text-[10px] tracking-wide leading-tight">
                  {tile.label}
                </div>
              </div>
            </div>
            <ChevronRight
              className={`${tile.chevronColor} size-4 shrink-0 hidden sm:block`}
              aria-hidden="true"
            />
          </Link>
        ))}
      </section>

      {/* ─── Quick Links ─── */}
      <Card className="shadow-bento rounded-xl border-border p-4">
        <div className="font-bold flex items-center gap-2 mb-3">
          <Zap className="text-primary size-5" />
          Quick Links
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href !== "#" ? "_blank" : undefined}
              rel={link.href !== "#" ? "noopener noreferrer" : undefined}
              className={`rounded-lg ${link.bg} border ${link.border} flex min-h-11 p-3 justify-between items-center gap-1 hover:shadow-sm transition-shadow`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <link.icon className={`${link.iconColor} size-4 shrink-0`} aria-hidden="true" />
                <span className="font-semibold text-xs truncate">{link.label}</span>
              </span>
              <ChevronRight className={`${link.chevronColor} size-4 shrink-0`} aria-hidden="true" />
            </a>
          ))}
        </div>
      </Card>

      {/* ─── Today on Campus + Important Notices ─── */}
      <section className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[60fr_40fr]">
        {/* Today on Campus */}
        <Card className="shadow-bento rounded-xl border-border p-5">
          <div className="border-b border-border flex pb-3 justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">
              <CalendarDays className="text-primary size-5" />
              Today on Campus
            </h2>
            <Link to="/events" className="font-semibold text-primary text-xs">
              View all →
            </Link>
          </div>
          {todaySchedule.length > 0 ? (
            <div>
              {todaySchedule.map((e, i) => (
                <Link
                  key={e.id}
                  to={`/events/${e.id}`}
                  className={`flex p-2 sm:p-3 items-center gap-3 sm:gap-4 hover:bg-accent/30 rounded-lg transition-colors ${i < todaySchedule.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="font-semibold text-center rounded-lg bg-blue-50 text-primary text-xs p-2 w-[4.5rem] sm:w-20 shrink-0">
                    {formatTimeRange(e)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{e.title}</div>
                    <div className="text-muted-foreground text-xs truncate">{e.organizer}</div>
                    {e.venue && (
                      <div className="text-muted-foreground text-xs flex mt-1 items-center gap-1 min-w-0">
                        <MapPin className="text-primary size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{e.venue}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No events scheduled for today.
            </div>
          )}
          <Link to="/calendar" className="font-semibold text-primary text-xs inline-flex mt-2">
            View full Calendar →
          </Link>
        </Card>

        {/* Important Notices */}
        <Card className="shadow-bento rounded-xl border-border p-5">
          <div className="border-b border-border flex pb-3 justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">
              <Bell className="text-primary size-5" />
              Important Notices
            </h2>
            <Link to="/notices" className="font-semibold text-primary text-xs">
              View all →
            </Link>
          </div>
          {notices.length > 0 ? (
            <div>
              {notices.map((n, i) => (
                <Link
                  key={n.id}
                  to={`/notices/${n.id}`}
                  className={`flex pt-3 pr-3 pb-3 pl-3 items-center gap-3 hover:bg-accent/30 rounded-lg transition-colors ${i < notices.length - 1 ? "border-b border-border" : ""}`}
                >
                  <span
                    className={`rounded-full ${NOTICE_DOTS[i % NOTICE_DOTS.length]} size-3 shrink-0`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{n.title}</div>
                    <div className="text-muted-foreground text-xs">
                      {n.department} · {formatDate(n.date)}
                    </div>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">No notices yet.</div>
          )}
        </Card>
      </section>

      {/* ─── Upcoming Events + Latest Opportunities ─── */}
      <section className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[60fr_40fr]">
        {/* Upcoming Events */}
        <Card className="shadow-bento rounded-xl border-border p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold flex items-center gap-2">
              <CalendarDays className="text-primary size-5" />
              Upcoming Events
            </h2>
            <Link to="/events" className="font-semibold text-primary text-xs">
              View all →
            </Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {upcomingEvents.map((e) => {
                const d = new Date(e.date + "T00:00:00");
                const day = d.getDate().toString().padStart(2, "0");
                const mon = d.toLocaleDateString("en-IN", { month: "short" });
                return (
                  <Link
                    key={e.id}
                    to={`/events/${e.id}`}
                    className="flex min-w-0 flex-col rounded-lg border border-border p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="font-bold text-primary text-lg">
                      {day}
                      <span className="text-xs">{mon}</span>
                    </div>
                    <div className="font-semibold text-xs mt-2 line-clamp-2">{e.title}</div>
                    <div className="text-muted-foreground text-[10px] mt-1 truncate">
                      {e.organizer}
                    </div>
                    {/* Date range pinned to the bottom of the card regardless of
                        how many lines the title/organizer above wrap to, so
                        every card in a row lines up — see mt-auto below. */}
                    <div className="text-primary text-[10px] mt-auto pt-2">
                      {e.endDate && e.endDate !== e.date
                        ? `${formatShortDate(e.date)}–${formatShortDate(e.endDate)}`
                        : formatShortDate(e.date)}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No upcoming events.
            </div>
          )}
        </Card>

        {/* Latest Opportunities */}
        <Card className="shadow-bento rounded-xl border-border p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold flex items-center gap-2">
              <BriefcaseBusiness className="text-primary size-5" />
              Latest Opportunities
            </h2>
            <Link to="/opportunities" className="font-semibold text-primary text-xs">
              View all →
            </Link>
          </div>
          {opportunities.length > 0 ? (
            <div>
              {opportunities.map((o, i) => (
                <Link
                  key={o.id}
                  to={`/opportunities/${o.id}`}
                  className={`flex pt-3 pr-3 pb-3 pl-3 items-center gap-3 hover:bg-accent/30 rounded-lg transition-colors ${i < opportunities.length - 1 ? "border-b border-border" : ""}`}
                >
                  <span className="rounded-full bg-violet-50 text-violet-600 flex justify-center items-center size-9 shrink-0">
                    <GraduationCap className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{o.title}</div>
                    <div className="text-muted-foreground text-xs truncate">{o.position}</div>
                    <div className="text-primary text-xs">Deadline: {formatDate(o.deadline)}</div>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No open opportunities.
            </div>
          )}
        </Card>
      </section>

      {/* ─── Chapters ─── */}
      <Card className="shadow-bento rounded-xl border-border p-5">
        <div className="flex justify-between items-center gap-3 mb-3">
          <h2 className="font-bold flex min-w-0 items-center gap-2">
            <Layers className="text-primary size-5 shrink-0" aria-hidden="true" />
            <span className="truncate">Chapters</span>
          </h2>
          <Link to="/chapters" className="font-semibold text-primary text-xs shrink-0">
            Explore Chapters →
          </Link>
        </div>
        {chapters.length > 0 ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {chapters.map((c) => (
              <Link
                key={c.id}
                to={`/chapters/${c.id}`}
                className="rounded-lg border border-border flex p-3 justify-between items-center gap-1 hover:shadow-sm transition-shadow"
              >
                <div className="min-w-0">
                  <span className="rounded-full bg-violet-50 text-violet-600 flex mb-2 justify-center items-center size-8">
                    <Layers className="size-4" aria-hidden="true" />
                  </span>
                  <div className="font-semibold text-xs truncate">{c.name}</div>
                  <div className="text-muted-foreground text-[10px] truncate">{c.tagline}</div>
                </div>
                <ChevronRight
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">No chapters yet.</div>
        )}
      </Card>

      {/* ─── Clubs ─── */}
      <Card className="shadow-bento rounded-xl border-border p-5">
        <div className="flex justify-between items-center gap-3 mb-3">
          <h2 className="font-bold flex min-w-0 items-center gap-2">
            <Users className="text-primary size-5 shrink-0" />
            <span className="truncate">Clubs & Societies</span>
          </h2>
          <Link to="/clubs" className="font-semibold text-primary text-xs shrink-0">
            Explore Clubs →
          </Link>
        </div>
        {clubs.length > 0 ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {clubs.map((c) => (
              <Link
                key={c.id}
                to={`/clubs/${c.id}`}
                className="rounded-lg border border-border flex p-3 justify-between items-center gap-1 hover:shadow-sm transition-shadow"
              >
                <div className="min-w-0">
                  <span
                    className={`rounded-full bg-blue-50 text-primary flex mb-2 justify-center items-center size-8`}
                  >
                    <Users className="size-4" />
                  </span>
                  <div className="font-semibold text-xs truncate">{c.name}</div>
                  <div className="text-muted-foreground text-[10px] truncate">{c.tagline}</div>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">No clubs yet.</div>
        )}
      </Card>
    </div>
  );
}
