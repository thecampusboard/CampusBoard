import { Component, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { AdCarousel } from "@/components/ad-carousel";
import { adImageUrl, loadPopupDataOnce } from "@/lib/ads";
import type { PopupData } from "@/lib/ads";

/**
 * Whether the visitor has closed the popup during THIS page load. Deliberately
 * a plain module variable — not localStorage/sessionStorage/cookies — so it
 * resets on every fresh website open (reload, new tab, new visit) and the
 * popup shows again, while client-side navigation between pages (including
 * back from /admin) doesn't re-open it.
 */
let dismissedThisLoad = false;

/** Poster height budget: viewport minus the header row, the controls row, paddings, margins and safe areas. */
const MAX_POSTER_HEIGHT =
  "max(8rem, calc(100dvh - 9.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))";

function preload(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    // Never hold the popup hostage to one slow image.
    window.setTimeout(() => resolve(true), 5000);
  });
}

/**
 * Global advertisement popup, mounted ONCE in the public shell (never over
 * /admin). Only the visible X button closes it: Escape, backdrop clicks and
 * poster/carousel clicks are all ignored. Any failure (network, RLS, broken
 * images) resolves to "show nothing" — it can never break the page behind it.
 */
function AdvertisementPopupInner() {
  const { pathname } = useLocation();
  const [data, setData] = useState<PopupData | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (dismissedThisLoad) return;
    let active = true;
    loadPopupDataOnce()
      .then(async (loaded) => {
        const checks = await Promise.all(
          loaded.ads.map(async (ad) => {
            const url = adImageUrl(ad);
            return url ? preload(url) : false;
          }),
        );
        const ads = loaded.ads.filter((_, i) => checks[i]);
        if (!active || ads.length === 0) return;
        setData({ ads, duration: loaded.duration });
        setOpen(true);
      })
      .catch(() => {
        /* No ads / offline / RLS error: show nothing. */
      });
    return () => {
      active = false;
    };
  }, []);

  const slides = useMemo(
    () =>
      (data?.ads ?? [])
        .filter((ad) => !failed.has(ad.id))
        .flatMap((ad) => {
          const imageUrl = adImageUrl(ad);
          return imageUrl ? [{ id: ad.id, title: ad.title, href: ad.href, imageUrl }] : [];
        }),
    [data, failed],
  );

  // Every poster broke after opening: close quietly.
  useEffect(() => {
    if (open && data && slides.length === 0) {
      dismissedThisLoad = true;
      setOpen(false);
    }
  }, [open, data, slides.length]);

  // The OAuth return page should never be covered by an ad.
  if (!data || !open || dismissedThisLoad || pathname.startsWith("/auth/")) return null;

  const close = () => {
    dismissedThisLoad = true;
    setOpen(false);
  };

  return (
    <DialogPrimitive.Root open modal onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          // Only the X closes. Everything else that Radix would treat as a
          // dismissal is cancelled.
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
          className="fixed inset-0 z-[101] flex items-center justify-center overflow-y-auto overscroll-contain p-3 outline-none pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]"
        >
          <DialogPrimitive.Title className="sr-only">Advertisement</DialogPrimitive.Title>
          <div className="m-auto flex w-max max-w-full flex-col gap-1 rounded-3xl border border-white/60 bg-white/95 p-2 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.55)] animate-in fade-in-0 zoom-in-95 duration-200 supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150 sm:p-3">
            <div className="flex items-center justify-between gap-3 pl-2">
              <span className="text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Advertisement
              </span>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close advertisement"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-border/70 bg-white/80 text-foreground shadow-sm transition-colors hover:bg-white focus-visible:outline-2"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </DialogPrimitive.Close>
            </div>
            <AdCarousel
              slides={slides}
              duration={data.duration}
              maxImageHeight={MAX_POSTER_HEIGHT}
              onImageError={(id) => setFailed((prev) => new Set(prev).add(id))}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** A crash inside the popup must never take the page down with it: render nothing instead. */
class PopupBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function AdvertisementPopup() {
  return (
    <PopupBoundary>
      <AdvertisementPopupInner />
    </PopupBoundary>
  );
}
