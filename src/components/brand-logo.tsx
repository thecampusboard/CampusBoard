import logoUrl from "@/assets/campusboard-logo.png";
import { cn } from "@/lib/utils";

/**
 * The real CampusBoard logo (src/assets/campusboard-logo.png, 551×572) with
 * the "CampusBoard" wordmark beside it. The intrinsic width/height are passed
 * so the browser reserves the correct box (no layout shift) and `h-*` + `w-auto`
 * keeps the aspect ratio — the image is never stretched.
 *
 * The image is decorative next to the wordmark (alt=""); wrap it in a link
 * that has its own accessible name.
 */
export function BrandLogo({
  size = "md",
  showWordmark = true,
  className,
  wordmarkClassName,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}) {
  const imgSize = {
    sm: "h-7",
    md: "h-9 sm:h-10",
    lg: "h-11",
    xl: "h-16 sm:h-20",
  }[size];
  const textSize = {
    sm: "text-base",
    md: "text-base sm:text-lg",
    lg: "text-xl",
    xl: "text-3xl",
  }[size];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <img
        src={logoUrl}
        alt=""
        width={551}
        height={572}
        decoding="async"
        className={cn("w-auto shrink-0 select-none object-contain", imgSize)}
      />
      {showWordmark ? (
        <span
          className={cn(
            "truncate font-bold tracking-tight whitespace-nowrap",
            textSize,
            wordmarkClassName,
          )}
        >
          <span className="text-foreground">Campus</span>
          <span className="text-primary">Board</span>
        </span>
      ) : null}
    </span>
  );
}
