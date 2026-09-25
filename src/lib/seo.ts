import { useEffect } from "react";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  const prevContent = tag?.getAttribute("content") ?? null;
  const existed = !!tag;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
  return () => {
    if (!tag) return;
    if (existed && prevContent !== null) tag.setAttribute("content", prevContent);
    else tag.remove();
  };
}

/**
 * Injects a single site-wide WebSite JSON-LD block once, using the actual
 * runtime origin (there's no build-time-known production domain in this
 * static SPA, so a hardcoded URL would risk being wrong — this stays
 * correct on any domain the app is deployed to, including preview
 * deployments). Call once from the app shell, not per-route.
 */
export function useSiteStructuredData() {
  useEffect(() => {
    const origin = window.location.origin;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "CampusBoard",
      description:
        "Notices, events, clubs, internships and campus buy & sell — everything happening on campus in one place.",
      url: origin,
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);
}

/**
 * Sets the document title, meta description, canonical URL and (for
 * private/account pages) a noindex robots tag for the current route.
 * Replaces TanStack Start's route-level `head()` config now that routing
 * is client-side only.
 *
 * `noindex` is opt-in and, once set by a page, is left alone by any nested
 * route that doesn't also pass it — see AdminLayout, which sets it once for
 * the whole /admin/* subtree; individual admin pages don't need to repeat
 * it themselves.
 */
export function usePageMeta(title: string, description?: string, options?: { noindex?: boolean }) {
  const noindex = options?.noindex ?? false;

  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const cleanups: Array<() => void> = [];

    if (description) {
      cleanups.push(upsertMeta("name", "description", description));
      cleanups.push(upsertMeta("property", "og:description", description));
      cleanups.push(upsertMeta("name", "twitter:description", description));
    }
    cleanups.push(upsertMeta("property", "og:title", title));
    cleanups.push(upsertMeta("name", "twitter:title", title));

    // Canonical: one absolute URL per page, no query string or hash, so
    // e.g. /notices?q=foo and /notices canonicalize to the same page —
    // search engines index the plain route instead of every filter/search
    // permutation of it.
    let canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonicalTag?.getAttribute("href") ?? null;
    const canonicalExisted = !!canonicalTag;
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    const pageUrl = window.location.origin + window.location.pathname;
    canonicalTag.setAttribute("href", pageUrl);
    const canonicalTagRef = canonicalTag;
    cleanups.push(() => {
      if (canonicalExisted && prevCanonical !== null)
        canonicalTagRef.setAttribute("href", prevCanonical);
      else canonicalTagRef.remove();
    });
    cleanups.push(upsertMeta("property", "og:url", pageUrl));

    if (noindex) {
      cleanups.push(upsertMeta("name", "robots", "noindex, nofollow"));
    }

    return () => {
      document.title = prevTitle;
      for (const cleanup of cleanups) cleanup();
    };
  }, [title, description, noindex]);
}
