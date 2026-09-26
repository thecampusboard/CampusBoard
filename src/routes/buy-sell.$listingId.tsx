import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Phone, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/lib/auth";
import { useContent } from "@/lib/content";
import { supabase, publicStorageUrl } from "@/lib/supabase";
import { formatDate, formatPrice, isListingActive, listingExpiryDate } from "@/lib/data";
import { listingIcon } from "@/lib/icons";
import { usePageMeta } from "@/lib/seo";
import { logEvent } from "@/lib/analytics";
import { ImageGallery } from "@/components/image-gallery";
import { ConfirmDeleteDialog } from "@/components/confirm-dialog";

export default function ListingDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const { listings, remove } = useContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const listing = listings.find((l) => l.id === listingId);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);

  usePageMeta(
    listing ? `${listing.title} — CampusBoard` : "Listing — CampusBoard",
    "Item details, price, condition and seller contact.",
  );

  useEffect(() => {
    if (listing) logEvent("listing", listing.id, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id]);

  const isOwner = !!listing && listing.ownerId === user?.id;
  const isAdmin = user?.role === "admin";
  // Public visitors and other students only ever see approved, active listings.
  // The owner and Admin can also view it while it's still going through approval.
  const canView = listing && (isListingActive(listing) || isOwner || isAdmin);

  if (!listing || !canView) {
    return (
      <Card className="p-8 border-border/70 shadow-sm max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-display font-bold tracking-tight">Listing not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This listing may still be awaiting Admin approval, or is no longer available.
        </p>
        <Link to="/buy-sell" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to marketplace
        </Link>
      </Card>
    );
  }

  const Icon = listingIcon(listing.id, listing.category);
  const canRemove = isOwner || isAdmin;
  const knownPhone = listing.sellerPhone || revealedPhone;
  const imageUrls = (listing.images ?? []).map((path) => publicStorageUrl("listing-images", path));

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Link
        to="/buy-sell"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to marketplace
      </Link>

      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        {imageUrls.length > 0 ? (
          <ImageGallery
            images={imageUrls}
            alt={listing.title}
            aspect="aspect-[16/10]"
            className="mb-6 sm:mb-8 rounded-2xl overflow-hidden"
          />
        ) : null}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"
              aria-hidden="true"
            >
              <Icon className="size-6" strokeWidth={1.75} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border/70 text-xs">
                  {listing.listingType}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {listing.category}
                </Badge>
              </div>
              <h1 className="pt-1.5 text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
                {listing.title}
              </h1>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground shrink-0">
            {formatPrice(listing.price)}
          </p>
        </div>

        {listing.status !== "approved" ? (
          <p className="mt-3 inline-block rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
            Status: {listing.status.replace(/_/g, " ")} — only visible to you and Admin.
          </p>
        ) : null}
        {listing.status === "rejected" && listing.rejectionReason ? (
          <p className="mt-3 rounded-xl bg-destructive/10 p-3.5 text-sm font-semibold text-destructive">
            Rejected: {listing.rejectionReason}
          </p>
        ) : null}
        {listing.status === "approved" && (isOwner || isAdmin) && listingExpiryDate(listing) ? (
          <p className="pt-2 text-xs font-medium text-muted-foreground">
            {isListingActive(listing) ? "Active until" : "Expired on"}{" "}
            {formatDate(listingExpiryDate(listing)!)}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3 border-y border-border/50 py-3 text-xs sm:text-sm text-muted-foreground font-medium">
          <span>Condition: <strong className="text-foreground font-semibold">{listing.condition}</strong></span>
          <span>·</span>
          <span>Posted: <strong className="text-foreground font-semibold">{formatDate(listing.postedOn)}</strong></span>
          <span>·</span>
          <span>Seller: <strong className="text-foreground font-semibold">{listing.sellerName}</strong></span>
        </div>

        <div className="pt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</h2>
          <p className="pt-2 text-base leading-relaxed text-foreground/90 whitespace-pre-line">{listing.description}</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-6 border-t border-border/50 mt-6">
          {knownPhone ? (
            <a
              href={`tel:${knownPhone}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <Phone className="size-4" aria-hidden="true" />
              Call {knownPhone}
            </a>
          ) : !user ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/login?redirect=${encodeURIComponent(`/buy-sell/${listing.id}`)}&action=${encodeURIComponent("View seller contact")}`,
                )
              }
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <Phone className="size-4" aria-hidden="true" />
              Login to see contact
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setRevealError(null);
                const { data, error } = await supabase.rpc("reveal_seller_phone", {
                  p_listing_id: listing.id,
                });
                if (error) setRevealError(error.message);
                else setRevealedPhone(data as string);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <Phone className="size-4" aria-hidden="true" />
              Show seller contact
            </button>
          )}
          {canRemove ? (
            <ConfirmDeleteDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                  Remove listing
                </button>
              }
              title="Remove this listing?"
              description={`"${listing.title}" will be permanently removed. This can't be undone.`}
              onConfirm={async () => {
                await remove("buy_sell_listings", listing.id);
                navigate("/buy-sell");
              }}
            />
          ) : null}
        </div>
        {revealError ? (
          <p role="alert" className="pt-2 text-sm font-semibold text-destructive">
            {revealError}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
