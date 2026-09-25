import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Accent } from "@/lib/data";

/** Accent surface classes — accents are section backgrounds, never decoration. */
export const accentSurface: Record<Accent, string> = {
  blue: "bg-blue/20",
  sky: "bg-sky/25",
  green: "bg-green/30",
  orange: "bg-orange/30",
  yellow: "bg-yellow/35",
  purple: "bg-purple/25",
  pink: "bg-pink/25",
  navy: "bg-navy text-navy-foreground",
};

export const accentSolid: Record<Accent, string> = {
  blue: "bg-blue",
  sky: "bg-sky",
  green: "bg-green",
  orange: "bg-orange",
  yellow: "bg-yellow",
  purple: "bg-purple",
  pink: "bg-pink",
  navy: "bg-navy",
};

export function Bento({
  className,
  accent,
  hover = true,
  children,
  as: As = "div",
}: {
  className?: string;
  accent?: Accent;
  hover?: boolean;
  children: ReactNode;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <As
      className={cn(
        accent ? cn("bento-tint", accentSurface[accent]) : "bento",
        hover && "bento-hover",
        "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function BentoHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: { label: string; to: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-4 sm:flex sm:justify-between",
        className,
      )}
    >
      <h2 className="min-w-0 truncate text-lg font-extrabold tracking-tight sm:text-xl">{title}</h2>
      {action ? (
        <Link
          to={action.to}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {action.label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export function Tag({
  children,
  accent = "navy",
  className,
}: {
  children: ReactNode;
  accent?: Accent;
  className?: string;
}) {
  const tone: Record<Accent, string> = {
    blue: "bg-blue/20 text-navy",
    sky: "bg-sky/25 text-navy",
    green: "bg-green/30 text-navy",
    orange: "bg-orange/25 text-navy",
    yellow: "bg-yellow/35 text-navy",
    purple: "bg-purple/25 text-navy",
    pink: "bg-pink/25 text-navy",
    navy: "bg-navy/10 text-navy",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
        tone[accent],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  highlight,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="pb-6">
      {eyebrow ? (
        <p className="pb-2 text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title} {highlight ? <span className="text-blue">{highlight}</span> : null}
      </h1>
      {description ? (
        <p className="max-w-2xl pt-3 text-sm text-muted-foreground sm:text-base">{description}</p>
      ) : null}
      {children ? <div className="pt-5">{children}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="bento flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-base font-bold">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
      {action ? <div className="pt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  hint = "That didn't load. Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bento flex flex-col items-center justify-center gap-2 border-destructive/30 px-6 py-16 text-center">
      <p className="text-base font-bold text-destructive">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-9 items-center rounded-full border border-foreground/20 bg-card px-4 text-xs font-bold transition-colors hover:bg-accent"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bento animate-pulse space-y-3", className)}>
      <div className="h-4 w-24 rounded-full bg-muted" />
      <div className="h-5 w-3/4 rounded-full bg-muted" />
      <div className="h-4 w-1/2 rounded-full bg-muted" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
