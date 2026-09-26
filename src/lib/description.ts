/**
 * Pure text helpers behind the description components in
 * components/description-text.tsx. These only change how text is DISPLAYED;
 * the stored value is never modified.
 */

/** Full-detail normalisation: keeps intentional line/paragraph breaks, drops excess whitespace. */
export function normalizeDescription(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ") // runs of spaces/tabs/nbsp -> one space (newlines untouched)
    .replace(/ ?\n ?/g, "\n") // no spaces hugging a line break
    .replace(/\n{3,}/g, "\n\n") // any run of blank lines -> a single blank line
    .trim();
}

/** Splits normalised text into paragraphs (blank-line separated). Single line breaks inside a paragraph are kept. */
export function descriptionParagraphs(text: string | null | undefined): string[] {
  const normalized = normalizeDescription(text);
  return normalized ? normalized.split("\n\n") : [];
}

/** Single-line flattening used for card previews. */
export function flattenDescription(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}
