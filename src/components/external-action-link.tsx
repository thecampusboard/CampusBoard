import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { cn, hasRealUrl } from "@/lib/utils";

/**
 * A call-to-action that opens an ADMIN-PROVIDED external URL (a registration
 * form, an application portal, a join form) directly in a new tab.
 *
 * This is deliberately just a link: CampusBoard has no internal registration
 * workflow, records nothing when it is clicked and needs no login. It renders
 * nothing at all unless the URL is a real http(s) URL, so the button only
 * ever appears when the relevant link actually exists.
 */
export function ExternalActionLink({
  href,
  label,
  variant = "primary",
  icon,
  className,
  onClick,
}: {
  href: string | null | undefined;
  label: string;
  variant?: "primary" | "outline";
  icon?: ReactNode;
  className?: string;
  /** Optional side effect (e.g. the existing anonymous click counter). Must not create per-user records. */
  onClick?: () => void;
}) {
  if (!hasRealUrl(href)) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all active:scale-[0.98]",
        variant === "primary"
          ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          : "border border-border bg-card text-foreground hover:bg-accent",
        className,
      )}
    >
      {icon}
      {label}
      <ExternalLink className="size-4 shrink-0 opacity-80" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
