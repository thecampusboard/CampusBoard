import { useState } from "react";
import { Check, X, ShieldCheck } from "lucide-react";

import { useContent } from "@/lib/content";
import { formatDate, formatPrice } from "@/lib/data";
import type { Notice, Listing } from "@/lib/data";
import { PaymentScreenshot } from "@/components/admin/admin-storage";
import { usePageMeta } from "@/lib/seo";

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
    <li className="rounded-xl border border-yellow/60 bg-yellow/10 p-4">
      <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
        {notice.category} · {notice.department}
      </p>
      <p className="text-base font-bold">{notice.title}</p>
      <p className="text-sm text-muted-foreground">{notice.description}</p>
      {notice.filePath ? (
        <p className="pt-1 text-xs font-semibold text-blue">Has an attachment</p>
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
            className="min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue"
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
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-navy px-4 text-xs font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60"
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
    <li className="rounded-xl border border-yellow/60 bg-yellow/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            {listing.listingType} · {listing.category}
          </p>
          <p className="text-base font-bold">{listing.title}</p>
          <p className="text-sm text-muted-foreground">{listing.description}</p>
          <p className="pt-1 text-sm font-semibold">{formatPrice(listing.price)}</p>
          <p className="text-xs text-muted-foreground">
            {listing.sellerName} · {listing.sellerPhone}
          </p>
          {listing.submittedOn ? (
            <p className="text-xs text-muted-foreground">
              Submitted {formatDate(listing.submittedOn)}
            </p>
          ) : null}
        </div>
        {listing.paymentScreenshotPath ? (
          <PaymentScreenshot path={listing.paymentScreenshotPath} title={listing.title} />
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
            className="min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue"
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
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-navy px-4 text-xs font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60"
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
    "Review pending notice and Buy & Sell submissions.",
  );
  const { pendingNotices, pendingListings, reviewNotice, approveListing, rejectListing } =
    useContent();

  return (
    <div className="space-y-5">
      <div className="bento p-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <ShieldCheck className="size-6 shrink-0" aria-hidden="true" />
          Approvals
        </h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Nothing a student submits — a notice or a Buy & Sell listing — becomes public until you
          approve it here.
        </p>
      </div>

      <section className="bento p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">
          Pending listings{" "}
          <span className="text-sm font-bold text-muted-foreground">
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
      </section>

      <section className="bento p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">
          Pending notices{" "}
          <span className="text-sm font-bold text-muted-foreground">({pendingNotices.length})</span>
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
      </section>
    </div>
  );
}
