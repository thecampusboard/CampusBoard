import { Link } from "react-router-dom";
import {
  Megaphone,
  CalendarDays,
  Users,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";

import { Card } from "@/components/ui/card";

export default function AdminOverviewPage() {
  usePageMeta("Admin Overview — CampusBoard", "Content counts and pending approvals at a glance.");
  const {
    notices,
    events,
    clubs,
    opportunities,
    pendingNotices,
    pendingEvents,
    pendingOpportunities,
  } = useContent();

  const cards = [
    {
      label: "Notices",
      count: notices.length,
      icon: Megaphone,
      to: "/admin/notices",
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Events",
      count: events.length,
      icon: CalendarDays,
      to: "/admin/events",
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Clubs",
      count: clubs.length,
      icon: Users,
      to: "/admin/clubs",
      accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Opportunities",
      count: opportunities.length,
      icon: Briefcase,
      to: "/admin/opportunities",
      accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
  ];

  const pendingTotal = pendingNotices.length + pendingEvents.length + pendingOpportunities.length;

  const rejectedNoticesCount = notices.filter((n) => n.status === "rejected").length;
  const rejectedEventsCount = events.filter((e) => e.status === "rejected").length;
  const rejectedOpportunitiesCount = opportunities.filter((o) => o.status === "rejected").length;
  const anyRejected =
    rejectedNoticesCount > 0 || rejectedEventsCount > 0 || rejectedOpportunitiesCount > 0;

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Admin</p>
        <h1 className="pt-2 text-3xl font-display font-extrabold tracking-tight sm:text-4xl text-foreground">
          Content overview
        </h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Manage approvals, live postings, and campus directory records.
        </p>
      </Card>

      {pendingTotal > 0 ? (
        <Link to="/admin/approvals" className="block group">
          <Card className="flex items-center gap-4 border-amber-500/30 bg-amber-500/10 p-5 transition-all hover:bg-amber-500/15 hover:border-amber-500/40">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            >
              <ShieldCheck className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {pendingTotal} item{pendingTotal === 1 ? "" : "s"} waiting for review
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                {pendingNotices.length} notice{pendingNotices.length === 1 ? "" : "s"} ·{" "}
                {pendingEvents.length} event{pendingEvents.length === 1 ? "" : "s"} ·{" "}
                {pendingOpportunities.length} opportunit
                {pendingOpportunities.length === 1 ? "y" : "ies"}
              </p>
            </div>
            <ArrowRight
              className="size-4 shrink-0 text-amber-700 dark:text-amber-300 group-hover:translate-x-1 transition-transform"
              aria-hidden="true"
            />
          </Card>
        </Link>
      ) : null}

      {anyRejected ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rejectedNoticesCount > 0 ? (
            <Link to="/admin/notices?status=rejected" className="block group">
              <Card className="p-5 border-border/70 hover:border-destructive/30 transition-all">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"
                    aria-hidden="true"
                  >
                    <AlertTriangle className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Rejected notices</p>
                    <p className="pt-1 text-2xl font-extrabold text-foreground">
                      {rejectedNoticesCount}
                    </p>
                    <p className="pt-1 text-xs text-muted-foreground">
                      Review, edit or delete rejected submissions.
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          ) : null}
          {rejectedEventsCount > 0 ? (
            <Link to="/admin/events?status=rejected" className="block group">
              <Card className="p-5 border-border/70 hover:border-destructive/30 transition-all">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"
                    aria-hidden="true"
                  >
                    <AlertTriangle className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Rejected events</p>
                    <p className="pt-1 text-2xl font-extrabold text-foreground">
                      {rejectedEventsCount}
                    </p>
                    <p className="pt-1 text-xs text-muted-foreground">
                      Review, edit or delete rejected submissions.
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          ) : null}
          {rejectedOpportunitiesCount > 0 ? (
            <Link to="/admin/opportunities?status=rejected" className="block group">
              <Card className="p-5 border-border/70 hover:border-destructive/30 transition-all">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"
                    aria-hidden="true"
                  >
                    <AlertTriangle className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Rejected opportunities</p>
                    <p className="pt-1 text-2xl font-extrabold text-foreground">
                      {rejectedOpportunitiesCount}
                    </p>
                    <p className="pt-1 text-xs text-muted-foreground">
                      Review, edit or delete rejected submissions.
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          ) : null}
        </div>
      ) : null}

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link to={c.to} className="block group">
              <Card className="flex items-center gap-4 p-5 border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-xl ${c.accent}`}
                  aria-hidden="true"
                >
                  <c.icon className="size-6" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-extrabold text-foreground">{c.count}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{c.label}</p>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all"
                  aria-hidden="true"
                />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
