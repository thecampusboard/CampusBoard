import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FormEvent } from "react";
import { ShoppingBag, Pencil, Trash2, ImagePlus, X } from "lucide-react";

import { useContent } from "@/lib/content";
import {
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  formatDate,
  formatPrice,
  listingExpiryDate,
} from "@/lib/data";
import type { Listing } from "@/lib/data";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Field, fieldClass } from "@/components/admin/form-field";
import { ConfirmDeleteDialog } from "@/components/confirm-dialog";
import { uploadImages } from "@/components/admin/admin-storage";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/bento";
import { Badge } from "@/components/ui/badge";
import { publicStorageUrl, supabase } from "@/lib/supabase";
import { usePageMeta } from "@/lib/seo";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_LABEL: Record<Listing["status"], string> = {
  payment_pending: "Payment pending",
  payment_submitted: "Payment submitted",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

const STATUS_TONE: Record<Listing["status"], string> = {
  payment_pending: "bg-secondary text-muted-foreground",
  payment_submitted: "bg-yellow/30 text-navy",
  pending_approval: "bg-yellow/30 text-navy",
  approved: "bg-green/20 text-navy",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-secondary text-muted-foreground",
};

function ListingEditDialog({ listing, trigger }: { listing: Listing; trigger: React.ReactNode }) {
  const { updateListing } = useContent();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(listing);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Listing>(key: K, value: Listing[K]) =>
    setDraft((d) => ({ ...d, [key]: value }) as Listing);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (
      !draft.title.trim() ||
      !draft.description.trim() ||
      !draft.sellerName.trim() ||
      !draft.sellerPhone.trim()
    ) {
      setError("Title, description, seller name and phone are required.");
      return;
    }
    for (const file of newImages) {
      if (!new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(file.type)) {
        setError("Photos must be JPEG, PNG, WebP or GIF images.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Each photo must be 5 MB or smaller.");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    let uploaded: string[] = [];
    try {
      if (newImages.length > 0) {
        uploaded = await uploadImages(
          "listing-images",
          `${listing.ownerId}/${listing.id}`,
          newImages,
        );
      }
      const nextImages = [
        ...(listing.images ?? []).filter((path) => !removedImages.includes(path)),
        ...uploaded,
      ];
      await updateListing(listing.id, {
        title: draft.title,
        price: draft.price,
        condition: draft.condition,
        category: draft.category,
        description: draft.description,
        sellerName: draft.sellerName,
        sellerPhone: draft.sellerPhone,
        images: nextImages,
      });
      const pathsToRemove = removedImages.filter((path) => !(uploaded as string[]).includes(path));
      if (pathsToRemove.length > 0)
        await supabase.storage
          .from("listing-images")
          .remove(pathsToRemove)
          .catch(() => {});
      setOpen(false);
    } catch (err) {
      if (uploaded.length > 0)
        await supabase.storage
          .from("listing-images")
          .remove(uploaded)
          .catch(() => {});
      setError(err instanceof Error ? err.message : "Couldn't save the listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(listing);
          setNewImages([]);
          setRemovedImages([]);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit listing</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title" required>
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className={fieldClass}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹)" required>
              <input
                type="number"
                min={0}
                value={draft.price}
                onChange={(e) => set("price", Number(e.target.value) || 0)}
                className={fieldClass}
                required
              />
            </Field>
            <Field label="Category">
              <select
                value={draft.category}
                onChange={(e) => set("category", e.target.value as Listing["category"])}
                className={fieldClass}
              >
                {LISTING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Condition">
            <select
              value={draft.condition}
              onChange={(e) => set("condition", e.target.value as Listing["condition"])}
              className={fieldClass}
            >
              {LISTING_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" required>
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={fieldClass}
              required
            />
          </Field>
          <Field
            label="Listing photos"
            hint="You can remove existing photos or add replacements. Up to 5 MB each."
          >
            {(draft.images ?? []).length > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {(draft.images ?? []).map((path) => (
                  <div
                    key={path}
                    className={`group relative overflow-hidden rounded-lg border border-border ${removedImages.includes(path) ? "opacity-40" : ""}`}
                  >
                    <img
                      src={publicStorageUrl("listing-images", path)}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        setRemovedImages((current) =>
                          current.includes(path)
                            ? current.filter((p) => p !== path)
                            : [...current, path],
                        )
                      }
                      className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-navy/90 text-white shadow-sm hover:bg-destructive"
                      aria-label={removedImages.includes(path) ? "Keep photo" : "Remove photo"}
                    >
                      {removedImages.includes(path) ? (
                        <span className="text-xs font-bold">↶</span>
                      ) : (
                        <X className="size-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {newImages.length > 0 ? (
              <p className="mt-2 text-xs font-semibold text-green">
                {newImages.length} new photo{newImages.length === 1 ? "" : "s"} selected
              </p>
            ) : null}
            <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-accent">
              <ImagePlus className="size-4 shrink-0" aria-hidden="true" />
              Add/replace photos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={(e) => {
                  setNewImages(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </label>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Seller name" required>
              <input
                value={draft.sellerName}
                onChange={(e) => set("sellerName", e.target.value)}
                className={fieldClass}
                required
              />
            </Field>
            <Field label="Seller phone" required>
              <input
                value={draft.sellerPhone}
                onChange={(e) => set("sellerPhone", e.target.value)}
                className={fieldClass}
                required
              />
            </Field>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 items-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_FILTERS = [
  "all",
  "pending_approval",
  "approved",
  "rejected",
  "expired",
  "payment_pending",
  "payment_submitted",
] as const;

export default function AdminBuySellPage() {
  usePageMeta("Buy & Sell — Admin — CampusBoard", "Manage every Buy & Sell listing.");
  const { listings, loading, error, refresh, remove } = useContent();
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus =
    (searchParams.get("status") as (typeof STATUS_FILTERS)[number] | null) ?? "all";
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>(
    STATUS_FILTERS.includes(initialStatus) ? initialStatus : "all",
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings
      .filter((l) => (status === "all" ? l.status !== "rejected" : l.status === status))
      .filter((l) => (q ? `${l.title} ${l.sellerName}`.toLowerCase().includes(q) : true))
      .sort((a, b) => b.postedOn.localeCompare(a.postedOn));
  }, [listings, search, status]);

  return (
    <div className="space-y-5">
      <div className="bento p-6">
        <h1 className="text-2xl font-extrabold">Buy & Sell</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Every listing regardless of status. New submissions are reviewed under Approvals.
        </p>
      </div>

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search listings or sellers…"
        sortOptions={STATUS_FILTERS.map((s) => ({
          value: s,
          label: s === "all" ? "Active & pending" : STATUS_LABEL[s as Listing["status"]],
        }))}
        sort={status}
        onSort={(v) => {
          const next = v as typeof status;
          setStatus(next);
          if (next === "rejected") setSearchParams({ status: "rejected" });
          else setSearchParams({});
        }}
        count={filtered.length}
        noun="listing"
      />

      {loading && listings.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error && listings.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={listings.length === 0 ? "No listings yet" : "No listings match your filters"}
          hint="Try a different search or status."
        />
      ) : (
        <ul className="bento divide-y divide-border p-2">
          {filtered.map((l) => {
            const cover = l.images?.[0] ? publicStorageUrl("listing-images", l.images[0]) : null;
            const expiry = listingExpiryDate(l);
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 p-3">
                {cover ? (
                  <img src={cover} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-yellow/25 text-navy"
                    aria-hidden="true"
                  >
                    <ShoppingBag className="size-4" strokeWidth={1.75} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{l.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatPrice(l.price)} · {l.sellerName}
                    {expiry ? ` · until ${formatDate(expiry)}` : ""}
                  </p>
                </div>
                <Badge className={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                <div className="flex shrink-0 gap-1.5">
                  <ListingEditDialog
                    listing={l}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Edit ${l.title}`}
                        className="grid size-9 place-items-center rounded-lg border border-border hover:bg-accent"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                    }
                  />
                  <ConfirmDeleteDialog
                    trigger={
                      <button
                        type="button"
                        aria-label={`Delete ${l.title}`}
                        className="grid size-9 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    }
                    title={`Delete "${l.title}"?`}
                    description="This listing will be permanently removed. This can't be undone."
                    onConfirm={() => remove("buy_sell_listings", l.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
