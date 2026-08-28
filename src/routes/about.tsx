import { Link } from "react-router-dom";
import {
  Megaphone,
  CalendarDays,
  Users,
  Briefcase,
  ShoppingBag,
  Sparkles,
  Code2,
  Target,
  ArrowRight,
} from "lucide-react";

import { Bento, Tag } from "@/components/bento";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const WHAT_WE_DO = [
  {
    icon: Megaphone,
    label: "Notices",
    text: "Official campus announcements, all verified.",
    accent: "blue" as const,
  },
  {
    icon: CalendarDays,
    label: "Events",
    text: "Fests, talks and everything worth showing up for.",
    accent: "green" as const,
  },
  {
    icon: Users,
    label: "Clubs",
    text: "Every society on campus, with recruitment updates.",
    accent: "purple" as const,
  },
  {
    icon: Briefcase,
    label: "Opportunities",
    text: "Internships and roles before the deadline hits.",
    accent: "orange" as const,
  },
  {
    icon: ShoppingBag,
    label: "Buy & Sell",
    text: "A trusted marketplace for the campus community.",
    accent: "yellow" as const,
  },
];

// Written as literal strings (not built via template interpolation) so
// Tailwind's static scanner can find and generate them — a computed class
// name like `[animation-delay:${i * 90}ms]` would never be emitted.
const CARD_DELAYS = [
  "[animation-delay:0ms]",
  "[animation-delay:90ms]",
  "[animation-delay:180ms]",
  "[animation-delay:270ms]",
  "[animation-delay:360ms]",
];

const VALUES = [
  {
    icon: Target,
    title: "One place, not five apps",
    text: "Notices, events, clubs, internships and the campus marketplace used to live scattered across WhatsApp groups, noticeboards and inboxes. CampusBoard pulls it into a single, reliable feed.",
    accent: "sky" as const,
    delay: "[animation-delay:120ms]",
  },
  {
    icon: Sparkles,
    title: "Built for students, by a student",
    text: "Every screen was designed around the questions students actually ask each morning: what's happening today, what's due soon, and what's worth knowing.",
    accent: "pink" as const,
    delay: "[animation-delay:240ms]",
  },
  {
    icon: Code2,
    title: "Small team, real ownership",
    text: "From the database schema to the last pixel of the UI, CampusBoard is built and maintained end-to-end — so it stays fast, focused and free of clutter.",
    accent: "green" as const,
    delay: "[animation-delay:360ms]",
  },
];

export default function AboutPage() {
  usePageMeta(
    "About Us — CampusBoard",
    "Meet the team behind CampusBoard — built to bring every campus update, from notices to internships, into one place.",
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* HERO -------------------------------------------------------------- */}
      <section>
        <Bento
          accent="navy"
          hover={false}
          className="relative overflow-hidden p-6 text-center sm:p-10 lg:p-14"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.10),transparent_40%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_75%,rgba(255,255,255,0.08),transparent_38%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl">
            <p className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 text-xs font-bold tracking-[0.18em] text-sky uppercase">
              About CampusBoard
            </p>
            <h1 className="animate-in fade-in-0 slide-in-from-bottom-4 [animation-delay:120ms] [animation-fill-mode:backwards] pt-4 text-4xl leading-[1.05] font-extrabold tracking-tight duration-700 sm:text-5xl">
              Everything on campus.
              <br />
              <span className="text-sky">Built in one place.</span>
            </h1>
            <p className="animate-in fade-in-0 slide-in-from-bottom-4 [animation-delay:240ms] [animation-fill-mode:backwards] mx-auto max-w-lg pt-4 text-sm text-navy-foreground/75 duration-700 sm:text-base">
              CampusBoard started as a simple idea: students shouldn't have to check five different
              places to know what's happening on their own campus.
            </p>
          </div>
        </Bento>
      </section>

      {/* WHAT WE DO ---------------------------------------------------------- */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
        {WHAT_WE_DO.map((item, i) => {
          const Icon = item.icon;
          return (
            <Bento
              key={item.label}
              accent={item.accent}
              className={cn(
                "animate-in fade-in-0 slide-in-from-bottom-4 [animation-fill-mode:backwards] duration-700",
                CARD_DELAYS[i],
              )}
            >
              <span
                className="grid size-11 place-items-center rounded-xl bg-card/70 text-navy ring-1 ring-navy/10"
                aria-hidden="true"
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <p className="pt-3 text-sm font-bold text-navy">{item.label}</p>
              <p className="pt-1 text-xs text-navy/70">{item.text}</p>
            </Bento>
          );
        })}
      </section>

      {/* WHY IT EXISTS --------------------------------------------------- */}
      <section className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        {VALUES.map((v) => {
          const Icon = v.icon;
          return (
            <Bento
              key={v.title}
              accent={v.accent}
              hover={false}
              className={cn(
                "animate-in fade-in-0 slide-in-from-bottom-4 [animation-fill-mode:backwards] duration-700",
                v.delay,
              )}
            >
              <span
                className="grid size-11 place-items-center rounded-xl bg-card/70 text-navy ring-1 ring-navy/10"
                aria-hidden="true"
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h2 className="pt-4 text-base font-extrabold text-navy">{v.title}</h2>
              <p className="pt-2 text-sm text-navy/75">{v.text}</p>
            </Bento>
          );
        })}
      </section>

      {/* FOUNDER ----------------------------------------------------------- */}
      <section>
        <Bento
          hover={false}
          className="animate-in fade-in-0 slide-in-from-bottom-4 [animation-delay:480ms] [animation-fill-mode:backwards] overflow-hidden p-0 duration-700"
        >
          <div className="grid lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="flex flex-col items-center justify-center gap-4 bg-navy p-8 text-center sm:p-10">
              <span
                className="animate-float grid size-24 place-items-center rounded-full bg-sky text-3xl font-extrabold text-navy ring-4 ring-navy-foreground/15"
                aria-hidden="true"
              >
                YK
              </span>
              <div>
                <p className="text-xl font-extrabold text-navy-foreground">Yash Kedia</p>
                <div className="pt-2">
                  <Tag accent="sky">Founder &amp; Developer</Tag>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-10">
              <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
                The person behind CampusBoard
              </p>
              <p className="max-w-2xl pt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
                Yash Kedia is the founder and developer of CampusBoard — designed and built end to
                end, from the database schema to the last pixel of the interface. The goal was
                simple: give every student one dependable place to find campus notices, events,
                clubs, opportunities and the buy &amp; sell marketplace, instead of chasing updates
                across scattered group chats and noticeboards.
              </p>
              <p className="max-w-2xl pt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
                CampusBoard is actively maintained, with new features shipped based on what the
                campus community actually needs.
              </p>
            </div>
          </div>
        </Bento>
      </section>

      {/* CTA ----------------------------------------------------------------- */}
      <section>
        <div className="bento flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:p-8 sm:text-left">
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">Ready to explore?</h2>
            <p className="pt-1 text-sm text-muted-foreground">
              Jump into notices, events, clubs and more — all in one place.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-transform active:scale-95"
          >
            Explore CampusBoard
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
