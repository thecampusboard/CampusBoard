import { descriptionParagraphs, flattenDescription } from "@/lib/description";
import { cn } from "@/lib/utils";

/**
 * Reusable description rendering for Clubs, Chapters, Events, Notices and
 * Opportunities. Descriptions are free text typed into an Admin/student form,
 * so they routinely contain stray runs of spaces, trailing whitespace and
 * piles of blank lines that used to be rendered verbatim and wreck layouts.
 *
 * This only ever changes how the text is DISPLAYED — the stored value is
 * never modified. Text is rendered as plain React text nodes (never HTML), so
 * there is nothing to sanitise and no dangerouslySetInnerHTML anywhere.
 *
 * Long unbroken strings (URLs, long words) wrap instead of overflowing.
 */

const WRAP = "min-w-0 [overflow-wrap:anywhere]";

/** Full description for DETAIL pages: paragraphs and intentional line breaks preserved. */
export function DescriptionText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const paragraphs = descriptionParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <div className={cn("space-y-4 text-base leading-relaxed text-foreground", WRAP, className)}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

const CLAMP: Record<2 | 3 | 4, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
};

/** Short preview for LISTING CARDS: whitespace flattened to one flow of text, clamped to 2–4 lines with an ellipsis. */
export function DescriptionPreview({
  text,
  lines = 3,
  className,
}: {
  text: string | null | undefined;
  lines?: 2 | 3 | 4;
  className?: string;
}) {
  const flat = flattenDescription(text);
  if (!flat) return null;
  return (
    <p className={cn("text-sm text-muted-foreground", CLAMP[lines], WRAP, className)}>{flat}</p>
  );
}
