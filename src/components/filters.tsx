import { Search as SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Search box used at the top of every browse page. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="bento flex items-center gap-3 px-4">
      <SearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-h-12 w-full bg-transparent text-sm font-semibold outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

/** Single-select chip row. `null` value means "All". */
export function ChipFilter({
  options,
  value,
  onChange,
  allLabel = "All",
  label,
}: {
  options: readonly string[];
  value: string | null;
  onChange: (v: string | null) => void;
  allLabel?: string;
  label: string;
}) {
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-9 items-center rounded-lg border px-4 text-xs font-semibold transition-all",
      active
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border/70 bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
    );

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      <button type="button" className={chip(value === null)} onClick={() => onChange(null)}>
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          className={chip(value === o)}
          onClick={() => onChange(value === o ? null : o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function ResultCount({ count, noun }: { count: number; noun: string }) {
  return (
    <p className="px-1 text-sm font-bold text-muted-foreground">
      {count} {count === 1 ? noun : `${noun}s`}
    </p>
  );
}
