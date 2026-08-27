import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
  /** Tailwind aspect-ratio class for the frame. */
  aspect?: string;
  /** Auto-advance through the images. Always pauses on hover, touch, or manual navigation. */
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const RESUME_DELAY_MS = 3500;

export function ImageGallery({
  images,
  alt,
  className,
  aspect = "aspect-[4/3]",
  autoPlay = false,
  autoPlayInterval = 4500,
}: ImageGalleryProps) {
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const lastInteraction = useRef(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback(
    (next: number) => {
      lastInteraction.current = Date.now();
      setIndex(((next % count) + count) % count);
    },
    [count],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Auto-advance: skips a tick if the user is hovering (desktop) or
  // interacted (tap/swipe/arrow click, any device) within the last
  // RESUME_DELAY_MS — so it never fights someone actively looking at it.
  useEffect(() => {
    if (!autoPlay || count <= 1) return;
    const timer = window.setInterval(() => {
      if (hovering) return;
      if (Date.now() - lastInteraction.current < RESUME_DELAY_MS) return;
      setIndex((i) => (i + 1) % count);
    }, autoPlayInterval);
    return () => window.clearInterval(timer);
  }, [autoPlay, autoPlayInterval, count, hovering]);

  // Keep index valid if the images array shrinks/changes underneath us.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-2xl bg-muted text-muted-foreground",
          aspect,
          className,
        )}
      >
        <ImageOff className="size-6" aria-hidden="true" />
      </div>
    );
  }

  if (count === 1) {
    return (
      <div className={cn("overflow-hidden rounded-2xl bg-muted", aspect, className)}>
        <img src={images[0]} alt={alt} className="size-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={cn("group/gallery relative overflow-hidden rounded-2xl bg-muted", aspect, className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
        lastInteraction.current = Date.now();
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (dx > 40) prev();
        else if (dx < -40) next();
        touchStartX.current = null;
      }}
      role="group"
      aria-roledescription="carousel"
      aria-label={alt}
    >
      {images.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={`${alt} — photo ${i + 1} of ${count}`}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out",
            i === index ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={i !== index}
        />
      ))}

      <button
        type="button"
        onClick={prev}
        aria-label="Previous photo"
        className="absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-sm transition-transform active:scale-95"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next photo"
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-sm transition-transform active:scale-95"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>

      <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to photo ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "h-1.5 rounded-full bg-background/70 transition-all",
              i === index ? "w-5 bg-background" : "w-1.5",
            )}
          />
        ))}
      </div>

      <div className="absolute top-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-bold text-foreground">
        {index + 1}/{count}
      </div>
    </div>
  );
}
