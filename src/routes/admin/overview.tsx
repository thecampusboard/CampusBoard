import { Link } from "react-router-dom";
import {
  Megaphone,
  CalendarDays,
  Users,
  Briefcase,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";

export default function AdminOverviewPage() {
  usePageMeta("Admin Overview — CampusBoard", "Content counts and pending approvals at a glance.");
  const { notices, events, clubs, opportunities, listings, pendingNotices, pendingListings } = useContent();

  const cards = [
    { label: "Notices", count: notices.length, icon: Megaphone, to: "/admin/notices", accent: "bg-orange/20" },
    { label: "Events", count: events.length, icon: CalendarDays, to: "/admin/events", accent: "bg-green/25" },
    { label: "Clubs", count: clubs.length, icon: Users, to: "/admin/clubs", accent: "bg-purple/25" },
    {
      label: "Opportunities",
      count: opportunities.length,
      icon: Briefcase,
      to: "/admin/opportunities",
      accent: "bg-sky/25",
    },
    {
      label: "Buy & Sell listings",
      count: listings.length,
      icon: ShoppingBag,
      to: "/admin/buy-sell",
      accent: "bg-yellow/30",
    },
  ];

  const pendingTotal = pendingNotices.length + pendingListings.length;

  return (
    <div className="space-y-5">
      <header className="bento p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">Admin</p>
        <h1 className="pt-2 text-3xl font-extrabold sm:text-4xl">Content overview</h1>
      </header>

      {pendingTotal > 0 ? (
        <Link
          to="/admin/approvals"
          className="bento bento-hover flex items-center gap-4 border-orange/50 bg-orange/10 p-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange text-navy" aria-hidden="true">
            <ShieldCheck className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {pendingTotal} item{pendingTotal === 1 ? "" : "s"} waiting for review
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingNotices.length} notice{pendingNotices.length === 1 ? "" : "s"} · {pendingListings.length}{" "}
              listing{pendingListings.length === 1 ? "" : "s"}
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}


      {(notices.some((n) => n.status === "rejected") || listings.some((l) => l.status === "rejected")) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {notices.some((n) => n.status === "rejected") ? (
            <Link to="/admin/notices?status=rejected" className="bento bento-hover min-w-0 p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive" aria-hidden="true">
                  <AlertTriangle className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Rejected notices</p>
                  <p className="pt-1 text-2xl font-extrabold">{notices.filter((n) => n.status === "rejected").length}</p>
                  <p className="pt-1 text-xs text-muted-foreground">Review, edit or delete rejected submissions.</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          ) : null}
          {listings.some((l) => l.status === "rejected") ? (
            <Link to="/admin/buy-sell?status=rejected" className="bento bento-hover min-w-0 p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive" aria-hidden="true">
                  <AlertTriangle className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Rejected listings</p>
                  <p className="pt-1 text-2xl font-extrabold">{listings.filter((l) => l.status === "rejected").length}</p>
                  <p className="pt-1 text-xs text-muted-foreground">Review, edit or remove rejected marketplace submissions.</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          ) : null}
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.label}>
            <Link to={c.to} className="bento bento-hover flex items-center gap-4 p-5">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-navy ${c.accent}`} aria-hidden="true">
                <c.icon className="size-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-extrabold">{c.count}</p>
                <p className="text-xs font-bold text-muted-foreground">{c.label}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
