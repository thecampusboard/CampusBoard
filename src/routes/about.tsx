import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CalendarDays,
  Code2,
  Heart,
  School,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { usePageMeta } from "@/lib/seo";

const WHAT_WE_DO = [
  {
    icon: Bell,
    label: "Notices",
    text: "Official and unofficial campus announcements.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: CalendarDays,
    label: "Events",
    text: "Fests, talks and everything worth showing up for.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Users,
    label: "Clubs",
    text: "Every society on campus, with recruitment updates.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Briefcase,
    label: "Opportunities",
    text: "Internships and roles before the deadline hits.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: CalendarDays,
    label: "Calendar",
    text: "The full academic calendar in one clean view.",
    color: "bg-orange-50 text-orange-600",
  },
];

const VALUES = [
  {
    icon: Sparkles,
    title: "Built for students",
    text: "Everything is designed around how students actually use information — fast, mobile-first, no fluff.",
  },
  {
    icon: Target,
    title: "One source of truth",
    text: "Stop checking five notice boards, three WhatsApp groups, and your email. CampusBoard is all of it.",
  },
  {
    icon: Code2,
    title: "Open and extensible",
    text: "Built on modern web technology with a clean data model, so it can grow with every campus.",
  },
  {
    icon: Heart,
    title: "Made with care",
    text: "Every detail — from loading states to empty states — is designed to feel good to use.",
  },
];

export default function AboutPage() {
  usePageMeta(
    "About — CampusBoard",
    "CampusBoard brings every campus update — notices, events, clubs and opportunities — into one beautifully simple platform.",
  );

  return (
    <div className="flex flex-col gap-10 max-w-4xl mx-auto">
      {/* Hero */}
      <section className="flex flex-col gap-4 text-center pt-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <School className="text-primary size-10" />
        </div>
        <p className="font-bold uppercase text-primary text-xs tracking-[0.22em]">About</p>
        <h1 className="font-bold text-foreground text-4xl sm:text-5xl tracking-tight">
          Campus<span className="text-primary">Board</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          A great campus is built by its people. CampusBoard brings every update — notices, events,
          clubs and opportunities — into one beautifully simple platform.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          <Link
            to="/notices"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground gap-2"
          >
            Explore Campus <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex h-11 items-center rounded-xl border border-input bg-card px-5 text-sm font-bold text-foreground hover:bg-accent"
          >
            Contact us
          </Link>
        </div>
      </section>

      {/* What we do */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-foreground text-2xl tracking-tight">What we do</h2>
          <p className="text-muted-foreground">Everything your campus needs, in one place.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WHAT_WE_DO.map((item) => (
            <Card key={item.label} className="shadow-bento rounded-xl border-border p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl ${item.color} flex justify-center items-center size-10`}
                >
                  <item.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.label}</h3>
                  <p className="text-muted-foreground text-sm">{item.text}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Our values */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-foreground text-2xl tracking-tight">Our values</h2>
          <p className="text-muted-foreground">The principles that guide everything we build.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <Card key={v.title} className="shadow-bento rounded-xl border-border p-5">
              <CardContent className="flex flex-col gap-3 p-0">
                <div className="rounded-xl bg-primary/10 text-primary flex justify-center items-center size-10">
                  <v.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">{v.title}</h3>
                <p className="text-muted-foreground text-sm">{v.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Built by */}
      <Card className="shadow-bento rounded-2xl border-border p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary text-lg font-bold">
            YK
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Built by</p>
            <h3 className="text-lg font-bold text-foreground">Yash Kedia</h3>
            <p className="text-sm text-muted-foreground">Founder &amp; CEO, CampusBoard.</p>
          </div>
        </div>
      </Card>

      {/* CTA */}
      <Card className="shadow-bento rounded-2xl border-border bg-primary/5 p-8 text-center">
        <h2 className="font-bold text-foreground text-2xl">Ready to explore your campus?</h2>
        <p className="text-muted-foreground mt-2">
          All the information you need — notices, events, clubs and internships.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground gap-2"
          >
            Go to homepage <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex h-11 items-center rounded-xl border border-input bg-card px-5 text-sm font-bold text-foreground hover:bg-accent"
          >
            Contact us
          </Link>
        </div>
      </Card>
    </div>
  );
}
