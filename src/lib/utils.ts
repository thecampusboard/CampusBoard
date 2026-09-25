import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * True for a well-formed absolute http(s) URL. Used to validate
 * Registration/Application URL fields in the Admin forms before they're
 * saved — an event/opportunity with a bad URL would otherwise silently
 * publish a broken "Register Now"/"Apply Now" button.
 */
export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Whether a stored registration/application URL is real — i.e. actually
 * usable — rather than the "#" placeholder older rows may still have (from
 * before the Admin form exposed this field) or an empty string.
 */
export function hasRealUrl(value: string | undefined | null): value is string {
  return !!value && value !== "#" && isValidHttpUrl(value);
}

/** Allow only an internal application path for post-auth redirects. */
export function safeRedirectPath(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return undefined;
    if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

/** Recover a validated external action after an auth round trip without creating an open redirect. */
export function readPendingExternalAction(): { href: string; label?: string } | undefined {
  try {
    const raw = sessionStorage.getItem("campusboard:pending-external-action");
    sessionStorage.removeItem("campusboard:pending-external-action");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { href?: unknown; label?: unknown };
    if (typeof parsed.href !== "string" || !isValidHttpUrl(parsed.href)) return undefined;
    return {
      href: parsed.href,
      ...(typeof parsed.label === "string" ? { label: parsed.label } : {}),
    };
  } catch {
    return undefined;
  }
}
