import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Phone, Trash2 } from "lucide-react";

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
      <div className="bento p-8">
        <h1 className="text-2xl font-extrabold">Listing not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This listing may still be awaiting Admin approval, or is no longer available.
        </p>
        <Link to="/buy-sell" className="mt-3 inline-block text-sm font-bold underline">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const Icon = listingIcon(listing.id, listing.category);
  const canRemove = isOwner || isAdmin;
  const knownPhone = listing.sellerPhone || revealedPhone;
  const imageUrls = (listing.images ?? []).map((path) => publicStorageUrl("listing-images", path));

  return (
    <article className="bento p-6 sm:p-8">
      {imageUrls.length > 0 ? (
        <ImageGallery
          images={imageUrls}
          alt={listing.title}
          aspect="aspect-[16/10]"
          className="mb-6 sm:mb-8"
        />
      ) : null}
      <span
        className="grid size-14 place-items-center rounded-2xl bg-yellow/30 text-navy ring-1 ring-navy/10"
        aria-hidden="true"
      >
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
      <p className="pt-4 text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
        {listing.listingType} · {listing.category}
      </p>
      <h1 className="pt-2 text-3xl font-extrabold">{listing.title}</h1>
      {listing.status !== "approved" ? (
        <p className="pt-1 text-xs font-bold text-orange">
          Status: {listing.status.replace(/_/g, " ")} — only visible to you and Admin.
        </p>
      ) : null}
      {listing.status === "rejected" && listing.rejectionReason ? (
        <p className="mt-2 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          Rejected: {listing.rejectionReason}
        </p>
      ) : null}
      {listing.status === "approved" && (isOwner || isAdmin) && listingExpiryDate(listing) ? (
        <p className="pt-1 text-xs font-bold text-muted-foreground">
          {isListingActive(listing) ? "Active until" : "Expired on"}{" "}
          {formatDate(listingExpiryDate(listing)!)}
        </p>
      ) : null}
      <p className="pt-2 text-2xl font-extrabold">{formatPrice(listing.price)}</p>
      <p className="text-sm font-semibold text-muted-foreground">
        {listing.condition} · Posted {formatDate(listing.postedOn)}
      </p>
      <p className="pt-4 text-base leading-relaxed">{listing.description}</p>
      <p className="pt-4 text-sm font-bold">Seller: {listing.sellerName}</p>

      <div className="flex flex-wrap gap-3 pt-6">
        {knownPhone ? (
          <a
            href={`tel:${knownPhone}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-all hover:bg-navy/90 active:scale-[0.98]"
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-all hover:bg-navy/90 active:scale-[0.98]"
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-all hover:bg-navy/90 active:scale-[0.98]"
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
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold hover:bg-accent"
              >
                <Trash2 className="size-4" aria-hidden="true" />
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

      <Link to="/buy-sell" className="mt-6 inline-block text-sm font-bold underline">
        Back to marketplace
      </Link>
    </article>
  );
}
