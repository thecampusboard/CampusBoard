import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, HandHeart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { UNIQUE_VIOLATION } from "@/lib/interests";
import type { InterestKind } from "@/lib/interests";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

/**
 * "Interested to Join" for a Club or Chapter. Collects the signed-in
 * student's interest (name/email come from their account and are re-derived
 * server-side) and stores it for Admin to review. It is NOT membership.
 *
 * A student can only ever submit once per club/chapter: the button turns into
 * a disabled "Interest submitted" state, while the database also enforces a
 * unique (user, target) index as a backstop against double-clicks/races.
 */
export function InterestButton({
  kind,
  targetId,
  targetName,
}: {
  kind: InterestKind;
  targetId: string;
  targetName: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [courseYear, setCourseYear] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetColumn = kind === "club" ? "club_id" : "chapter_id";

  // Has this student already shown interest? (RLS only ever returns their own rows.)
  useEffect(() => {
    if (!user) {
      setSubmitted(false);
      return;
    }
    let active = true;
    setSubmitted(null);
    supabase
      .from("community_interests")
      .select("id")
      .eq("user_id", user.id)
      .eq(targetColumn, targetId)
      .limit(1)
      .then(({ data, error: err }) => {
        if (active) setSubmitted(err ? false : (data?.length ?? 0) > 0);
      });
    return () => {
      active = false;
    };
  }, [user, targetColumn, targetId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !user) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("community_interests").insert({
      kind,
      [targetColumn]: targetId,
      user_id: user.id,
      phone: phone.trim() || null,
      course_year: courseYear.trim() || null,
      message: message.trim() || null,
    });
    setBusy(false);
    if (err && err.code !== UNIQUE_VIOLATION) {
      setError("We couldn't save your interest. Please try again in a moment.");
      return;
    }
    setSubmitted(true);
    setOpen(false);
    toast.success(
      err
        ? `You've already told us you're interested in ${targetName}.`
        : `Thanks! Your interest in ${targetName} has been shared.`,
    );
  };

  const baseButton =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all active:scale-[0.98]";

  if (submitted) {
    return (
      <span
        role="status"
        className={`${baseButton} border border-primary/30 bg-primary/10 text-primary`}
      >
        <Check className="size-4" aria-hidden="true" />
        Interest submitted
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={submitted === null && !!user}
        onClick={() => {
          if (!user) {
            navigate(
              `/login?redirect=${encodeURIComponent(location.pathname)}&action=${encodeURIComponent("Interested to Join")}`,
            );
            return;
          }
          setError(null);
          setOpen(true);
        }}
        className={`${baseButton} bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60`}
      >
        <HandHeart className="size-4" aria-hidden="true" />
        Interested to Join
      </button>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Interested in {targetName}?</DialogTitle>
            <DialogDescription>
              We&apos;ll share your details with the CampusBoard team so they can reach out. This
              doesn&apos;t make you a member.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 rounded-xl bg-secondary/50 p-3 text-sm">
              <p className="min-w-0">
                <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Name
                </span>
                <span className="block break-words font-semibold">{user?.name}</span>
              </p>
              <p className="min-w-0">
                <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Email
                </span>
                <span className="block break-all font-semibold">{user?.email}</span>
              </p>
            </div>
            <label className="block text-xs font-bold text-foreground/80">
              Course &amp; year{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
              <input
                value={courseYear}
                onChange={(e) => setCourseYear(e.target.value)}
                maxLength={100}
                placeholder="B.Tech CSE, 2nd year"
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-bold text-foreground/80">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-bold text-foreground/80">
              Anything you&apos;d like to add{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={3}
                className={inputClass}
              />
            </label>
            {error ? (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="min-h-11 rounded-lg border border-border px-5 text-sm font-semibold hover:bg-accent disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 sm:ml-2"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? "Submitting…" : "Submit interest"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
