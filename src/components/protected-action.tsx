import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * A CTA that requires a signed-in student.
 * Public visitors see the locked label and are sent to /login with a
 * continue-to target; signed-in students go straight through to the URL.
 */
export function ProtectedAction({
  href,
  label,
  lockedLabel,
  variant = "primary",
  icon,
  className,
  onProceed,
}: {
  href: string;
  label: string;
  lockedLabel?: string;
  variant?: "primary" | "outline";
  icon?: ReactNode;
  className?: string;
  onProceed?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all focus-visible:outline-2";
  const styles =
    variant === "primary"
      ? "bg-navy text-navy-foreground hover:bg-navy/90 active:scale-[0.98]"
      : "border border-border bg-card text-foreground hover:bg-accent active:scale-[0.98]";

  if (!user) {
    return (
      <button
        type="button"
        className={cn(base, styles, className)}
        onClick={() => {
          if (/^https?:\/\//i.test(href)) {
            sessionStorage.setItem(
              "campusboard:pending-external-action",
              JSON.stringify({ href, label }),
            );
            navigate(`/login?action=${encodeURIComponent(label)}`);
          } else {
            navigate(
              `/login?redirect=${encodeURIComponent(href)}&action=${encodeURIComponent(label)}`,
            );
          }
        }}
      >
        {icon}
        {lockedLabel ?? label}
        <Lock className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={onProceed}
      className={cn(base, styles, className)}
    >
      {icon}
      {label}
    </a>
  );
}
