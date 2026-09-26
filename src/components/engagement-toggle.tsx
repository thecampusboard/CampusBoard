import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * "Register" / "Save" / "Join" toggle used on the event, opportunity and
 * club detail pages. This is CampusBoard's own bookmark of the item (backed
 * by event_registrations / opportunity_saves / club_memberships — see
 * supabase/migrations/016_engagement_features.sql) — separate from an
 * event's/opportunity's external "Register Now" / "Apply Now" link, which
 * always points off-site. Toggling this is what populates the "Registered
 * events" / "Saved opportunities" / "Joined clubs" sections of the student
 * dashboard with real data.
 */
export function EngagementToggle({
  active,
  onToggle,
  icon: Icon,
  label,
  activeLabel,
  redirectTo,
}: {
  active: boolean;
  onToggle: () => Promise<void>;
  icon: LucideIcon;
  label: string;
  activeLabel: string;
  redirectTo: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() =>
          navigate(
            `/login?redirect=${encodeURIComponent(redirectTo)}&action=${encodeURIComponent(label)}`,
          )
        }
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-all hover:bg-accent active:scale-[0.98]"
      >
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await onToggle();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
          } finally {
            setBusy(false);
          }
        }}
        className={cn(
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60",
          active
            ? "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
            : "border border-border bg-card text-foreground hover:bg-accent",
        )}
      >
        {active ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Icon className="size-4" aria-hidden="true" />
        )}
        {active ? activeLabel : label}
      </button>
      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
