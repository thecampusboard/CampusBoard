import { publicStorageUrl, supabase } from "@/lib/supabase";

/**
 * Advertisement popup data layer (supabase/migrations/021_advertisements.sql).
 * Public eligibility is enforced by RLS; the filters here repeat it so an
 * Admin session (whose policy can see every ad) still only gets eligible ads
 * in the public popup.
 */

export const AD_DURATIONS = [2, 3, 5] as const;
export type AdDuration = (typeof AD_DURATIONS)[number];
export const DEFAULT_AD_DURATION: AdDuration = 3;

export interface Advertisement {
  id: string;
  title: string;
  imagePath: string | null;
  href: string;
  startAt: string;
  endAt: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdRow {
  id: string;
  title: string;
  image_path: string | null;
  href: string;
  start_at: string;
  end_at: string;
  display_order: number;
  is_active: boolean;
}

export const AD_COLUMNS = "id, title, image_path, href, start_at, end_at, display_order, is_active";

export const fromAdRow = (r: AdRow): Advertisement => ({
  id: r.id,
  title: r.title,
  imagePath: r.image_path,
  href: r.href,
  startAt: r.start_at,
  endAt: r.end_at,
  displayOrder: r.display_order,
  isActive: r.is_active,
});

export type AdStatus = "active" | "scheduled" | "expired" | "disabled" | "no-poster";

export function adStatus(ad: Advertisement, now = new Date()): AdStatus {
  if (!ad.isActive) return "disabled";
  if (!ad.imagePath) return "no-poster";
  if (new Date(ad.startAt) > now) return "scheduled";
  if (new Date(ad.endAt) < now) return "expired";
  return "active";
}

export function adImageUrl(ad: Pick<Advertisement, "imagePath">): string | null {
  return ad.imagePath ? publicStorageUrl("content-images", ad.imagePath) : null;
}

export function parseAdDuration(value: unknown): AdDuration {
  const n = Number((value as { durationSeconds?: unknown } | null)?.durationSeconds);
  return (AD_DURATIONS as readonly number[]).includes(n) ? (n as AdDuration) : DEFAULT_AD_DURATION;
}

export interface PopupData {
  ads: Advertisement[];
  duration: AdDuration;
}

/** Loads everything the popup needs in one round trip (two queries, run in parallel). */
export async function fetchPopupData(): Promise<PopupData> {
  const nowIso = new Date().toISOString();
  const [adsRes, settingRes] = await Promise.all([
    supabase
      .from("advertisements")
      .select(AD_COLUMNS)
      .eq("is_active", true)
      .not("image_path", "is", null)
      .lte("start_at", nowIso)
      .gte("end_at", nowIso)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("site_settings").select("value").eq("key", "ad_popup").maybeSingle(),
  ]);
  if (adsRes.error) throw new Error(adsRes.error.message);
  const ads = ((adsRes.data ?? []) as AdRow[]).map(fromAdRow);
  return {
    ads,
    duration: settingRes.error ? DEFAULT_AD_DURATION : parseAdDuration(settingRes.data?.value),
  };
}

let popupDataPromise: Promise<PopupData> | null = null;

/** One fetch per page load, shared by every caller — no duplicate queries and no polling. */
export function loadPopupDataOnce(): Promise<PopupData> {
  popupDataPromise ??= fetchPopupData();
  return popupDataPromise;
}
