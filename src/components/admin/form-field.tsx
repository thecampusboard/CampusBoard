import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Link2 } from "lucide-react";

import { cn } from "@/lib/utils";

export const fieldClass =
  "mt-1 min-h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue";

/** Label + control + optional hint, used by every admin create/edit form. */
export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={className ?? "block text-xs font-bold text-foreground/80"}>
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
      {children}
      {hint ? <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/**
 * URL input with a link icon prefix so external-link fields (registration
 * links, apply links, social links, notice attachments) are recognizable at
 * a glance instead of looking like any other text field. Used everywhere
 * an admin or student types in an http(s) URL.
 */
export const UrlField = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "mt-1 flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:ring-2 focus-within:ring-blue",
        className,
      )}
    >
      <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        ref={ref}
        type="url"
        placeholder="https://"
        className="min-h-8 min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
        {...props}
      />
    </div>
  ),
);
UrlField.displayName = "UrlField";
