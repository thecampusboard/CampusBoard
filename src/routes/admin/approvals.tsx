import { useState } from "react";
import { Check, X, ShieldCheck } from "lucide-react";

import { useContent } from "@/lib/content";
import { formatDate, formatPrice } from "@/lib/data";
import type { Notice, Listing, CampusEvent, Opportunity } from "@/lib/data";
import { PaymentScreenshot } from "@/components/admin/admin-storage";
import { usePageMeta } from "@/lib/seo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function PendingNoticeRow({
  notice,
  onReview,
}: {
  notice: Notice;
  onReview: (id: string, decision: "approved" | "rejected", reason?: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      await onReview(notice.id, "approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve the notice.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setError("Add a short reason so the student knows what to fix.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onReview(notice.id, "rejected", reason);
      setRejecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject the notice.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs"
        >
          {notice.category}
        </Badge>
        <span className="text-xs text-muted-foreground font-medium">{notice.department}</span>
      </div>
      <p className="text-base font-bold text-foreground">{notice.title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{notice.description}</p>
      {notice.filePath ? (
        <p className="pt-1 text-xs font-semibold text-primary">Has an attachment</p>
      ) : null}

      {error ? (
        <p role="alert" className="pt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (shown to the student)"
            rows={2}
            className="min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={reject}
              className="inline-flex min-h-9 items-center rounded-lg bg-destructive px-4 text-xs font-bold text-destructive-foreground disabled:opacity-60"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-bold hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={approve}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            <Check className="size-3.5" aria-hidden="true" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-xs font-bold hover:bg-accent"
          >
            <X className="size-3.5" aria-hidden="true" />
            Reject
          </button>
        </div>
      )}
    </li>
  );
}

function PendingListingRow({
  listing,
  onApprove,
  onReject,
}: {
  listing: Listing;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      await onApprove(listing.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve the listing.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setError("Add a short reason so the seller knows what to fix.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onReject(listing.id, reason);
      setRejecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject the listing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs"
            >
              {listing.listingType}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">{listing.category}</span>
          </div>
          <p className="text-base font-bold text-foreground pt-1">{listing.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
          <p className="pt-1.5 text-base font-extrabold text-foreground">
            {formatPrice(listing.price)}
          </p>
          <p className="text-xs text-muted-foreground">
            Seller: <strong className="text-foreground">{listing.sellerName}</strong> ·{" "}
            {listing.sellerPhone}
          </p>
          {listing.submittedOn ? (
            <p className="text-xs text-muted-foreground">
              Submitted {formatDate(listing.submittedOn)}
            </p>
          ) : null}
        </div>
        {listing.paymentScreenshotPath ? (
          <div className="shrink-0 rounded-xl overflow-hidden border border-border shadow-sm">
            <PaymentScreenshot path={listing.paymentScreenshotPath} title={listing.title} />
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="pt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (shown to the seller)"
            rows={2}
            className="min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={reject}
              className="inline-flex min-h-9 items-center rounded-lg bg-destructive px-4 text-xs font-bold text-destructive-foreground disabled:opacity-60"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-bold hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={approve}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            <Check className="size-3.5" aria-hidden="true" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-xs font-bold hover:bg-accent"
          >
            <X className="size-3.5" aria-hidden="true" />
            Reject
          </button>
        </div>
      )}
    </li>
  );
}

function PendingEventRow({
  event,
  onReview,
}: {
  event: CampusEvent;
  onReview: (id: string, decision: "approved" | "rejected", reason?: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      await onReview(event.id, "approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve the event.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setError("Add a short reason so the student knows what to fix.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onReview(event.id, "rejected", reason);
      setRejecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject the event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs"
        >
          {formatDate(event.date)}
        </Badge>
        <span className="text-xs text-muted-foreground font-medium">{event.venue}</span>
      </div>
      <p className="text-base font-bold text-foreground">{event.title}</p>
      <p className="text-xs text-muted-foreground">Organizer: {event.organizer}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>

      {error ? (
        <p role="alert" className="pt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (shown to the student)"
            rows={2}
            className="min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={reject}
              className="inline-flex min-h-9 items-center rounded-lg bg-destructive px-4 text-xs font-bold text-destructive-foreground disabled:opacity-60"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-bold hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={approve}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            <Check className="size-3.5" aria-hidden="true" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-xs font-bold hover:bg-accent"
          >
            <X className="size-3.5" aria-hidden="true" />
            Reject
          </button>
        </div>
      )}
    </li>
  );
}

function PendingOpportunityRow({
  opportunity,
  onReview,
}: {
  opportunity: Opportunity;
  onReview: (id: string, decision: "approved" | "rejected", reason?: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      await onReview(opportunity.id, "approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve the opportunity.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setError("Add a short reason so the student knows what to fix.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onReview(opportunity.id, "rejected", reason);
      setRejecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject the opportunity.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs"
        >
          {opportunity.type}
        </Badge>
        <span className="text-xs text-muted-foreground font-medium">
          Deadline {formatDate(opportunity.deadline)}
        </span>
      </div>
      <p className="text-base font-bold text-foreground">{opportunity.title}</p>
      <p className="text-xs text-muted-foreground">
        {opportunity.organization} · {opportunity.position} · {opportunity.location}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">{opportunity.description}</p>

      {error ? (
        <p role="alert" className="pt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (shown to the student)"
            rows={2}
            className="min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={reject}
              className="inline-flex min-h-9 items-center rounded-lg bg-destructive px-4 text-xs font-bold text-destructive-foreground disabled:opacity-60"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-bold hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={approve}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            <Check className="size-3.5" aria-hidden="true" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-xs font-bold hover:bg-accent"
          >
            <X className="size-3.5" aria-hidden="true" />
            Reject
          </button>
        </div>
      )}
    </li>
  );
}

export default function AdminApprovalsPage() {
  usePageMeta(
    "Approvals — Admin — CampusBoard",
    "Review pending notice, event and opportunity submissions.",
  );
  const {
    pendingNotices,
    pendingEvents,
    pendingOpportunities,
    pendingListings,
    reviewNotice,
    reviewEvent,
    reviewOpportunity,
    approveListing,
    rejectListing,
  } = useContent();

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
          <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
          Approvals
        </h1>
        <p className="pt-2 text-sm text-muted-foreground">
          Student notice, event and opportunity submissions require review before appearing live
          across campus.
        </p>
      </Card>

      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Pending listings{" "}
          <span className="text-sm font-semibold text-muted-foreground">
            ({pendingListings.length})
          </span>
        </h2>
        {pendingListings.length === 0 ? (
          <p className="pt-4 text-sm text-muted-foreground">No listings waiting for approval.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingListings.map((l) => (
              <PendingListingRow
                key={l.id}
                listing={l}
                onApprove={approveListing}
                onReject={rejectListing}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Pending notices{" "}
          <span className="text-sm font-semibold text-muted-foreground">
            ({pendingNotices.length})
          </span>
        </h2>
        {pendingNotices.length === 0 ? (
          <p className="pt-4 text-sm text-muted-foreground">No notices waiting for review.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingNotices.map((n) => (
              <PendingNoticeRow key={n.id} notice={n} onReview={reviewNotice} />
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Pending events{" "}
          <span className="text-sm font-semibold text-muted-foreground">
            ({pendingEvents.length})
          </span>
        </h2>
        {pendingEvents.length === 0 ? (
          <p className="pt-4 text-sm text-muted-foreground">No events waiting for review.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingEvents.map((e) => (
              <PendingEventRow key={e.id} event={e} onReview={reviewEvent} />
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Pending opportunities{" "}
          <span className="text-sm font-semibold text-muted-foreground">
            ({pendingOpportunities.length})
          </span>
        </h2>
        {pendingOpportunities.length === 0 ? (
          <p className="pt-4 text-sm text-muted-foreground">No opportunities waiting for review.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingOpportunities.map((o) => (
              <PendingOpportunityRow key={o.id} opportunity={o} onReview={reviewOpportunity} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
