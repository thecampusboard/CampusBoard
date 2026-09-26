import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowUp, Eye, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";

import { AD_COLUMNS, AD_DURATIONS, DEFAULT_AD_DURATION, adImageUrl, adStatus } from "@/lib/ads";
import { fromAdRow, parseAdDuration } from "@/lib/ads";
import type { AdDuration, AdRow, AdStatus, Advertisement } from "@/lib/ads";
import { supabase } from "@/lib/supabase";
import { cn, isValidHttpUrl } from "@/lib/utils";
import { usePageMeta } from "@/lib/seo";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Field, fieldClass, UrlField } from "@/components/admin/form-field";
import { uploadImages } from "@/components/admin/admin-storage";
import { AdCarousel } from "@/components/ad-carousel";
import { ConfirmDeleteDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/bento";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_POSTER_BYTES = 5 * 1024 * 1024;

const STATUS_STYLES: Record<AdStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-700" },
  scheduled: { label: "Scheduled", className: "bg-primary/10 text-primary" },
  expired: { label: "Expired", className: "bg-amber-500/10 text-amber-700" },
  disabled: { label: "Disabled", className: "bg-secondary text-muted-foreground" },
  "no-poster": { label: "No poster", className: "bg-destructive/10 text-destructive" },
};

/** ISO timestamp -> value for <input type="datetime-local"> in the admin's local time. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWindow(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: AdStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", s.className)}>
      {s.label}
    </span>
  );
}

/** Admin preview: exactly the poster stage the public popup shows, but with a normal close behaviour. */
function PreviewDialog({ ad, trigger }: { ad: Advertisement; trigger: React.ReactNode }) {
  const url = adImageUrl(ad);
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-max max-w-[calc(100vw-1rem)] items-center">
        <DialogHeader>
          <DialogTitle>Preview: {ad.title}</DialogTitle>
          <DialogDescription>
            How this poster appears in the popup. Clicking it opens {ad.href}
          </DialogDescription>
        </DialogHeader>
        {url ? (
          <AdCarousel
            slides={[{ id: ad.id, title: ad.title, href: ad.href, imageUrl: url }]}
            duration={DEFAULT_AD_DURATION}
            autoplay={false}
            maxImageHeight="calc(100dvh - 13rem)"
          />
        ) : (
          <p className="text-sm text-muted-foreground">This ad has no poster yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AdFormDialog({
  ad,
  nextOrder,
  onSaved,
  trigger,
}: {
  ad?: Advertisement;
  nextOrder: number;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const isEdit = !!ad;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [href, setHref] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [order, setOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    const now = new Date();
    const inThirtyDays = new Date(now.getTime() + 30 * 86400000);
    setTitle(ad?.title ?? "");
    setHref(ad?.href ?? "");
    setStartAt(toLocalInput(ad?.startAt ?? now.toISOString()));
    setEndAt(toLocalInput(ad?.endAt ?? inThirtyDays.toISOString()));
    setOrder(ad?.displayOrder ?? nextOrder);
    setActive(ad?.isActive ?? true);
    setFile(null);
    setRemoveImage(false);
    setError(null);
  };

  // Local preview of a just-picked file (object URL, revoked on change/unmount).
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const existingUrl = ad && !removeImage ? adImageUrl(ad) : null;
  const shownUrl = previewUrl ?? existingUrl;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim()) return setError("Give the advertisement a name.");
    if (!isValidHttpUrl(href.trim()))
      return setError("Click URL must start with http:// or https://.");
    if (!startAt || !endAt) return setError("Set both a start and an end date/time.");
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return setError("The end must be after the start.");
    }
    if (file) {
      if (!IMAGE_TYPES.has(file.type))
        return setError("Poster must be a JPEG, PNG, WebP or GIF image.");
      if (file.size > MAX_POSTER_BYTES) return setError("Poster must be 5 MB or smaller.");
    }
    const hasPoster = !!file || !!existingUrl;
    if (active && !hasPoster)
      return setError("Upload a poster before enabling this advertisement.");

    setSubmitting(true);
    setError(null);
    const id = ad?.id ?? crypto.randomUUID();
    let uploadedPath: string | null = null;
    try {
      let imagePath: string | null = removeImage ? null : (ad?.imagePath ?? null);
      if (file) {
        const [path] = await uploadImages("content-images", `ads/${id}`, [file]);
        uploadedPath = path ?? null;
        imagePath = uploadedPath;
      }
      const row = {
        title: title.trim(),
        href: href.trim(),
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        display_order: Math.trunc(order) || 0,
        is_active: active,
        image_path: imagePath,
      };
      const result = isEdit
        ? await supabase.from("advertisements").update(row).eq("id", id).select("id")
        : await supabase
            .from("advertisements")
            .insert({ id, ...row })
            .select("id");
      if (result.error) throw new Error(result.error.message);
      if (!result.data || result.data.length === 0)
        throw new Error("That advertisement could not be saved.");
      // The old poster is only removed once the row no longer points at it.
      if (ad?.imagePath && ad.imagePath !== imagePath) {
        await supabase.storage
          .from("content-images")
          .remove([ad.imagePath])
          .catch(() => {});
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      if (uploadedPath) {
        await supabase.storage
          .from("content-images")
          .remove([uploadedPath])
          .catch(() => {});
      }
      setError(err instanceof Error ? err.message : "Couldn't save the advertisement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit advertisement" : "New advertisement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Advertisement name" required hint="Also used as the poster's alt text.">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className={fieldClass}
              required
            />
          </Field>

          <div>
            <p className="text-xs font-bold text-foreground/80">Poster</p>
            {shownUrl ? (
              <div className="mt-1 flex items-center gap-3 rounded-xl border border-border bg-secondary/60 p-2.5">
                <img
                  src={shownUrl}
                  alt="Poster preview"
                  className="max-h-28 w-auto max-w-[45%] rounded-lg object-contain"
                />
                <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {file ? (
                    <span className="block truncate font-bold text-foreground">{file.name}</span>
                  ) : (
                    "Current poster"
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setRemoveImage(true);
                  }}
                  className="min-h-10 rounded-lg border border-destructive/25 px-3 text-xs font-bold text-destructive hover:bg-destructive/5"
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                {removeImage ? "Poster will be removed. " : ""}No poster selected.
              </p>
            )}
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-card px-3 text-xs font-semibold text-muted-foreground focus-within:ring-2 focus-within:ring-primary hover:bg-accent">
              <ImagePlus className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{shownUrl ? "Replace poster" : "Choose poster"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setRemoveImage(false);
                }}
              />
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, WebP or GIF, up to 5 MB.
            </p>
          </div>

          <Field label="Click URL" required hint="Opens in a new tab when the poster is clicked.">
            <UrlField value={href} onChange={(e) => setHref(e.target.value)} required />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start" required>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className={fieldClass}
                required
              />
            </Field>
            <Field label="End" required>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className={fieldClass}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display order" hint="Lower numbers show first.">
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className={fieldClass}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-border bg-card px-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-5 accent-[var(--primary)]"
              />
              Active
            </label>
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
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create advertisement"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAdvertisementsPage() {
  usePageMeta("Popup Ads — Admin — CampusBoard", "Manage the site-wide advertisement popup.", {
    noindex: true,
  });
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [duration, setDuration] = useState<AdDuration>(DEFAULT_AD_DURATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [durationSaving, setDurationSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const [adsRes, settingRes] = await Promise.all([
      supabase
        .from("advertisements")
        .select(AD_COLUMNS)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("site_settings").select("value").eq("key", "ad_popup").maybeSingle(),
    ]);
    if (adsRes.error) setError(adsRes.error.message);
    else setAds(((adsRes.data ?? []) as AdRow[]).map(fromAdRow));
    if (!settingRes.error) setDuration(parseAdDuration(settingRes.data?.value));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? ads.filter((a) => `${a.title} ${a.href}`.toLowerCase().includes(q)) : ads;
  }, [ads, search]);

  const saveDuration = async (next: AdDuration) => {
    if (next === duration || durationSaving) return;
    setActionError(null);
    setDurationSaving(true);
    const { error: err } = await supabase
      .from("site_settings")
      .upsert({ key: "ad_popup", value: { durationSeconds: next } }, { onConflict: "key" });
    setDurationSaving(false);
    if (err) setActionError("Couldn't save the duration. Please try again.");
    else setDuration(next);
  };

  const toggleActive = async (ad: Advertisement) => {
    setActionError(null);
    if (!ad.isActive && !ad.imagePath) {
      setActionError(`Upload a poster for “${ad.title}” before enabling it.`);
      return;
    }
    setBusyId(ad.id);
    const { data, error: err } = await supabase
      .from("advertisements")
      .update({ is_active: !ad.isActive })
      .eq("id", ad.id)
      .select("id");
    setBusyId(null);
    if (err || !data?.length) setActionError("Couldn't update that advertisement.");
    else await load();
  };

  const move = async (ad: Advertisement, direction: -1 | 1) => {
    const list = [...ads];
    const from = list.findIndex((a) => a.id === ad.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= list.length) return;
    const [moved] = list.splice(from, 1);
    if (!moved) return;
    list.splice(to, 0, moved);
    setActionError(null);
    setBusyId(ad.id);
    // Renumber 0..n-1 and only write the rows whose position actually changed.
    for (const [i, item] of list.entries()) {
      if (item.displayOrder === i) continue;
      const { error: err } = await supabase
        .from("advertisements")
        .update({ display_order: i })
        .eq("id", item.id);
      if (err) {
        setActionError("Couldn't reorder the advertisements.");
        break;
      }
    }
    setBusyId(null);
    await load();
  };

  const remove = async (ad: Advertisement) => {
    const { data, error: err } = await supabase
      .from("advertisements")
      .delete()
      .eq("id", ad.id)
      .select("id");
    if (err) throw new Error(err.message);
    if (!data?.length) throw new Error("That advertisement no longer exists.");
    if (ad.imagePath) {
      await supabase.storage
        .from("content-images")
        .remove([ad.imagePath])
        .catch(() => {});
    }
    await load();
  };

  const nextOrder = ads.length === 0 ? 0 : Math.max(...ads.map((a) => a.displayOrder)) + 1;

  return (
    <div className="space-y-6">
      <Card className="border-border/70 p-5 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Popup ads
        </h1>
        <p className="pt-2 text-sm text-muted-foreground">
          Posters shown in a popup every time someone opens CampusBoard. Only enabled ads inside
          their start/end window are shown, in display order. Visitors can only close the popup with
          its X button.
        </p>
      </Card>

      <Card className="border-border/70 p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-bold text-foreground">Seconds per ad</h2>
        <p className="pt-1 text-xs text-muted-foreground">
          How long each poster is shown before the next one appears (when 2 or more ads are live).
        </p>
        <div
          role="radiogroup"
          aria-label="Seconds per ad"
          className="mt-3 inline-flex rounded-xl border border-border bg-secondary p-1"
        >
          {AD_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={duration === d}
              disabled={durationSaving}
              onClick={() => void saveDuration(d)}
              className={cn(
                "min-h-10 min-w-16 rounded-lg px-4 text-sm font-bold transition disabled:opacity-60",
                duration === d
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d}s
            </button>
          ))}
        </div>
      </Card>

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search ads…"
        count={filtered.length}
        noun="ad"
        extra={
          <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">
            <AdFormDialog
              nextOrder={nextOrder}
              onSaved={() => void load()}
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New ad
                </button>
              }
            />
          </div>
        }
      />

      {actionError ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState hint={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={ads.length === 0 ? "No advertisements yet" : "No ads match your search"}
          hint={
            ads.length === 0
              ? "With no live ads, the popup stays hidden."
              : "Try a different search term."
          }
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {filtered.map((ad, i) => {
            const status = adStatus(ad);
            const url = adImageUrl(ad);
            const canReorder = !search.trim() && busyId === null;
            return (
              <li key={ad.id} className="min-w-0">
                <Card className="border-border/70 p-3 shadow-sm sm:p-4">
                  <div className="flex items-start gap-3">
                    {url ? (
                      <img
                        src={url}
                        alt=""
                        loading="lazy"
                        className="h-20 w-16 shrink-0 rounded-lg border border-border bg-secondary object-contain sm:h-24 sm:w-20"
                      />
                    ) : (
                      <span
                        className="grid h-20 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-border text-[10px] font-bold text-muted-foreground sm:h-24 sm:w-20"
                        aria-hidden="true"
                      >
                        No poster
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words text-sm font-bold">{ad.title}</p>
                        <StatusBadge status={status} />
                      </div>
                      <a
                        href={ad.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block truncate text-xs font-semibold text-primary hover:underline"
                      >
                        {ad.href}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatWindow(ad.startAt)} → {formatWindow(ad.endAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">Order: {ad.displayOrder}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ad.isActive}
                      aria-label={`${ad.isActive ? "Disable" : "Enable"} ${ad.title}`}
                      disabled={busyId === ad.id}
                      onClick={() => void toggleActive(ad)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold hover:bg-accent disabled:opacity-60"
                    >
                      <span
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          ad.isActive ? "bg-primary" : "bg-foreground/25",
                        )}
                        aria-hidden="true"
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 size-4 rounded-full bg-white transition-all",
                            ad.isActive ? "left-[1.125rem]" : "left-0.5",
                          )}
                        />
                      </span>
                      {ad.isActive ? "Enabled" : "Disabled"}
                    </button>
                    <div className="ml-auto flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        aria-label={`Move ${ad.title} up`}
                        disabled={!canReorder || i === 0}
                        onClick={() => void move(ad, -1)}
                        className="grid size-10 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-40"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${ad.title} down`}
                        disabled={!canReorder || i === filtered.length - 1}
                        onClick={() => void move(ad, 1)}
                        className="grid size-10 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-40"
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </button>
                      <PreviewDialog
                        ad={ad}
                        trigger={
                          <button
                            type="button"
                            aria-label={`Preview ${ad.title}`}
                            className="grid size-10 place-items-center rounded-lg border border-border hover:bg-accent"
                          >
                            <Eye className="size-4" aria-hidden="true" />
                          </button>
                        }
                      />
                      <AdFormDialog
                        ad={ad}
                        nextOrder={nextOrder}
                        onSaved={() => void load()}
                        trigger={
                          <button
                            type="button"
                            aria-label={`Edit ${ad.title}`}
                            className="grid size-10 place-items-center rounded-lg border border-border hover:bg-accent"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                        }
                      />
                      <ConfirmDeleteDialog
                        trigger={
                          <button
                            type="button"
                            aria-label={`Delete ${ad.title}`}
                            className="grid size-10 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        }
                        title={`Delete “${ad.title}”?`}
                        description="The advertisement and its poster will be permanently removed. This can't be undone."
                        onConfirm={() => remove(ad)}
                      />
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}