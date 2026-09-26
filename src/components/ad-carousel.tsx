import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CarouselSlide {
  id: string;
  title: string;
  href: string;
  imageUrl: string;
}

/**
 * The poster stage + minimal controls shared by the public popup and the
 * Admin preview. It never closes anything: poster taps only follow the ad's
 * link, and the prev/next/dot buttons only move between slides.
 *
 * Sizing: only the current poster is in the layout, so the stage always hugs
 * it (no empty letterboxing when posters differ in shape). Each poster keeps
 * its natural aspect ratio (auto width/height) and is capped by
 * `maxImageHeight` / the viewport width, so nothing is cropped or stretched.
 */
export function AdCarousel({
  slides,
  duration,
  autoplay = true,
  maxImageHeight,
  onImageError,
  className,
}: {
  slides: CarouselSlide[];
  /** Seconds each poster stays up before advancing. */
  duration: number;
  autoplay?: boolean;
  /** CSS length capping poster height, e.g. "calc(100dvh - 9rem)". */
  maxImageHeight: string;
  onImageError?: (id: string) => void;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const touchStartX = useRef<number | null>(null);

  // Keep the index valid if a poster fails to load and is dropped.
  const current = count === 0 ? 0 : Math.min(index, count - 1);

  useEffect(() => {
    if (!autoplay || count < 2) return;
    const timer = window.setTimeout(() => setIndex((current + 1) % count), duration * 1000);
    return () => window.clearTimeout(timer);
  }, [autoplay, count, current, duration]);

  const go = (next: number) => setIndex(((next % count) + count) % count);

  const slide = slides[current];
  if (!slide) return null;

  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-2", className)}>
      <div
        className="grid touch-pan-y justify-items-center"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (count < 2 || start === null || end === undefined) return;
          if (Math.abs(end - start) > 48) go(current + (end < start ? 1 : -1));
        }}
      >
        {slide ? (
          <a
            key={slide.id}
            href={slide.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${slide.title} (opens in a new tab)`}
            className="block max-w-full animate-in overflow-hidden rounded-2xl duration-500 fade-in-0 motion-reduce:animate-none"
          >
            <img
              src={slide.imageUrl}
              alt={slide.title}
              draggable={false}
              decoding="async"
              onError={() => onImageError?.(slide.id)}
              style={{
                maxHeight: maxImageHeight,
                maxWidth: "min(calc(100vw - 2.5rem), 30rem)",
              }}
              className="block h-auto w-auto max-w-full select-none object-contain"
            />
          </a>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Previous advertisement"
            className="grid size-11 shrink-0 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-black/5 focus-visible:outline-2"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <div className="flex items-center" role="group" aria-label="Choose advertisement">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show advertisement ${i + 1} of ${count}`}
                aria-current={i === current}
                className="grid size-6 place-items-center rounded-full focus-visible:outline-2"
              >
                <span
                  className={cn(
                    "block rounded-full transition-all",
                    i === current ? "h-2 w-5 bg-primary" : "size-2 bg-foreground/25",
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Next advertisement"
            className="grid size-11 shrink-0 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-black/5 focus-visible:outline-2"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
