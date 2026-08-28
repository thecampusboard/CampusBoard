/**
 * CampusBoard content layer.
 * Single source of truth for all content shown across the app.
 * Swap these arrays for API/database reads without touching UI components.
 */

export type Accent = "blue" | "sky" | "green" | "orange" | "yellow" | "purple" | "pink" | "navy";

export type NoticeCategory =
  "Academic" | "Examination" | "Placement" | "Department" | "General" | "Other";

export type NoticeStatus = "pending" | "approved" | "rejected";

export interface Notice {
  id: string;
  title: string;
  description: string;
  category: NoticeCategory;
  department: string;
  years: string[];
  semesters: string[];
  date: string; // ISO
  fileType: "PDF" | "Image" | "Link" | "Text";
  fileLabel?: string;
  externalUrl?: string;
  /** Storage object path (in the `notice-files` bucket) for an attached file/image. */
  filePath?: string;
  featured?: boolean;
  views: number;
  /** Approval workflow — Admin-authored notices default to 'approved'; student submissions start 'pending'. */
  status: NoticeStatus;
  /** auth.users id of whoever submitted the notice (Admin or student). */
  createdBy?: string;
  /** Optional club this notice belongs to. */
  clubId?: string;
  /** Set by Admin when rejecting a student submission. */
  rejectionReason?: string;
  /** ISO timestamp Admin approved/rejected the submission. */
  reviewedAt?: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  organizer: string;
  clubId?: string;
  date: string; // ISO date
  endDate?: string;
  /** 24-hour "HH:MM", campus-local. Preferred over the legacy `time` text — set by every event created/edited through the current Admin form. */
  startTime?: string;
  /** 24-hour "HH:MM", campus-local. Optional — omit for an open-ended/unspecified end. */
  endTime?: string;
  /** Legacy free-text time range (e.g. "5:00 PM – 7:00 PM"). Display fallback only for events that predate startTime/endTime — every new/edited event sets startTime instead. */
  time?: string;
  venue: string;
  description: string;
  eligibility: string;
  registrationDeadline?: string;
  registrationUrl: string;
  contact?: string;
  accent: Accent;
  featured?: boolean;
  views: number;
  registerClicks: number;
}

export interface Club {
  id: string;
  name: string;
  tagline: string;
  about: string;
  accent: Accent;
  members: number;
  founded: string;
  recruitment: string;
  announcements: string[];
  gallery: string[];
  socials: { label: string; url: string }[];
  pastEvents: { title: string; date: string }[];
  /** Storage object path (in the public `content-images` bucket) for a custom club image. */
  imagePath?: string;
}

export type OpportunityType =
  | "Internship"
  | "Job"
  | "Hackathon"
  | "Competition"
  | "Research"
  | "Fellowship"
  | "Workshop"
  | "Conference";

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  position: string;
  type: OpportunityType;
  location: string;
  eligibility: string;
  yearsBranches: string;
  description: string;
  skills: string[];
  stipend?: string;
  deadline: string;
  applyUrl: string;
  accent: Accent;
  featured?: boolean;
  views: number;
  applyClicks: number;
}

export type ListingType = "Buy" | "Sell";

export type ListingStatus =
  | "payment_pending"
  | "payment_submitted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "expired";

export const LISTING_FEE = 20;
export const LISTING_DURATION_DAYS = 30;

export interface Listing {
  id: string;
  listingType: ListingType;
  title: string;
  price: number;
  condition: "Like New" | "Excellent Condition" | "Good Condition" | "Fair Condition";
  category: "Books" | "Electronics" | "Stationery" | "Hostel" | "Other";
  description: string;
  sellerName: string;
  sellerPhone: string;
  postedOn: string;
  accent: Accent;
  views: number;
  contactReveals: number;
  /** Approval workflow (all listings created through /buy-sell/new). */
  status: ListingStatus;
  /** auth.users id of the student who submitted the listing (ownership checks). */
  ownerId?: string;
  /** Storage object paths (in the `listing-images` bucket) for the seller's photos. */
  images?: string[];
  /** Storage object path (in the PRIVATE `payment-screenshots` bucket), Admin/owner only. */
  paymentScreenshotPath?: string;
  /** ISO date the listing was submitted for approval. */
  submittedOn?: string;
  /** ISO date Admin approved the listing — the 30-day window starts here. */
  approvedOn?: string;
  /** Set by Admin when rejecting a listing, so the seller knows what to fix. */
  rejectionReason?: string;
}

/** Approved listings run for LISTING_DURATION_DAYS from their approval date. */
export function isListingActive(listing: Listing): boolean {
  if (listing.status !== "approved") return false;
  if (!listing.approvedOn) return true;
  const approved = new Date(listing.approvedOn + "T00:00:00");
  const expiry = new Date(approved);
  expiry.setDate(expiry.getDate() + LISTING_DURATION_DAYS);
  return new Date() < expiry;
}

/** ISO date an approved listing's 30-day window ends. Null until Admin approves it. */
export function listingExpiryDate(listing: Listing): string | null {
  if (!listing.approvedOn) return null;
  const approved = new Date(listing.approvedOn + "T00:00:00");
  approved.setDate(approved.getDate() + LISTING_DURATION_DAYS);
  return approved.toISOString().slice(0, 10);
}

/** Listings visible to everyone: approved and still inside the 30-day window. */
export function publicListings(listings: Listing[]): Listing[] {
  return listings.filter(isListingActive);
}

/**
 * Notices visible to everyone: approved only. The raw `notices` array from
 * useContent() also includes the signed-in user's own pending/rejected
 * submissions (RLS lets an author see their own row at any status) — every
 * general/public listing surface (home, /notices, search, a club page)
 * must filter through this before rendering, or a student's own
 * not-yet-reviewed notice would appear to be public.
 */
export function publicNotices(notices: Notice[]): Notice[] {
  return notices.filter((n) => n.status === "approved");
}

export const NOTICE_CATEGORIES: NoticeCategory[] = [
  "Academic",
  "Examination",
  "Placement",
  "Department",
  "General",
  "Other",
];

/** Every accent used for a card/section background — the full domain of the Accent type, for Admin form <select>s. */
export const ACCENTS: Accent[] = [
  "blue",
  "sky",
  "green",
  "orange",
  "yellow",
  "purple",
  "pink",
  "navy",
];

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
export const SEMESTERS = [
  "Semester 1",
  "Semester 2",
  "Semester 3",
  "Semester 4",
  "Semester 5",
  "Semester 6",
  "Semester 7",
  "Semester 8",
];

export const LISTING_CATEGORIES: Listing["category"][] = [
  "Books",
  "Electronics",
  "Stationery",
  "Hostel",
  "Other",
];

export const LISTING_CONDITIONS: Listing["condition"][] = [
  "Like New",
  "Excellent Condition",
  "Good Condition",
  "Fair Condition",
];

export const OPPORTUNITY_TYPES: OpportunityType[] = [
  "Internship",
  "Job",
  "Hackathon",
  "Competition",
  "Research",
  "Fellowship",
  "Workshop",
  "Conference",
];

/**
 * Labels + accent colors for the homepage stat tiles. The counts themselves
 * are computed live from useContent() in routes/index.tsx (see
 * campusStats()) — this only carries the presentational shape (order,
 * label, color) since that part isn't derived from data.
 */
export const CAMPUS_STAT_TILES: {
  key: "eventsToday" | "notices" | "opportunities" | "clubs";
  label: string;
  accent: Accent;
}[] = [
  { key: "eventsToday", label: "Events Today", accent: "blue" },
  { key: "notices", label: "Notices", accent: "orange" },
  { key: "opportunities", label: "Open Opportunities", accent: "purple" },
  { key: "clubs", label: "Active Clubs", accent: "green" },
];

/**
 * Real, live counts for the homepage stat tiles — no hardcoded numbers.
 * "Events Today" counts events whose [date, endDate] range includes today.
 * "Notices" counts currently-public (approved) notices. "Open
 * Opportunities" counts opportunities whose deadline hasn't passed.
 * "Active Clubs" is every club in the directory (there's no separate
 * active/inactive flag on the clubs table).
 */
export function campusStats(
  source: SearchSource,
): Record<"eventsToday" | "notices" | "opportunities" | "clubs", number> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    eventsToday: source.events.filter((e) => e.date <= today && (e.endDate ?? e.date) >= today)
      .length,
    notices: publicNotices(source.notices).length,
    opportunities: source.opportunities.filter((o) => o.deadline >= today).length,
    clubs: source.clubs.length,
  };
}

/* ---------- helpers ---------- */

function parseDisplayDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoMatch) {
    const d = new Date(`${raw}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string) {
  const d = parseDisplayDate(value);
  return d
    ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Date unavailable";
}

export function formatShortDate(value: string) {
  const d = parseDisplayDate(value);
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Date unavailable";
}

export function formatPrice(value: number) {
  return "₹" + value.toLocaleString("en-IN");
}

/** "14:30" -> "2:30 PM". Returns the input unchanged if it isn't "HH:MM". */
export function formatTime12h(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

/**
 * Best available display string for an event's time, preferring the
 * structured startTime/endTime (set by every event created/edited through
 * the current Admin form) over the legacy free-text `time` column, which
 * only pre-migration rows still rely on.
 */
export function formatEventTimeRange(
  event: Pick<CampusEvent, "startTime" | "endTime" | "time">,
): string {
  if (event.startTime) {
    return event.endTime
      ? `${formatTime12h(event.startTime)} – ${formatTime12h(event.endTime)}`
      : formatTime12h(event.startTime);
  }
  return event.time ?? "";
}

export type SearchResultType = "NOTICE" | "EVENT" | "CLUB" | "OPPORTUNITY" | "BUY & SELL";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  to: string;
}

export interface SearchSource {
  notices: Notice[];
  events: CampusEvent[];
  clubs: Club[];
  opportunities: Opportunity[];
  listings: Listing[];
}

/**
 * Searches across all CampusBoard content. Every collection comes from the
 * live Supabase-backed content store (see useContent()), so Admin-created
 * and student-submitted content is always searchable. Buy & Sell results
 * are always restricted to approved, non-expired listings.
 */
export function globalSearch(query: string, source: SearchSource): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hit = (...parts: (string | undefined)[]) =>
    parts.filter(Boolean).join(" ").toLowerCase().includes(q);

  const results: SearchResult[] = [];

  source.events
    .filter((e) => hit(e.title, e.description, e.organizer, e.venue))
    .forEach((e) =>
      results.push({
        type: "EVENT",
        id: e.id,
        title: e.title,
        subtitle: `${formatDate(e.date)} · ${e.venue}`,
        to: `/events/${e.id}`,
      }),
    );

  source.opportunities
    .filter((o) => hit(o.title, o.description, o.organization, o.type, o.position))
    .forEach((o) =>
      results.push({
        type: "OPPORTUNITY",
        id: o.id,
        title: o.title,
        subtitle: `${o.organization} · ${o.type}`,
        to: `/opportunities/${o.id}`,
      }),
    );

  source.clubs
    .filter((c) => hit(c.name, c.tagline, c.about))
    .forEach((c) =>
      results.push({
        type: "CLUB",
        id: c.id,
        title: c.name,
        subtitle: c.tagline,
        to: `/clubs/${c.id}`,
      }),
    );

  publicNotices(source.notices)
    .filter((n) => hit(n.title, n.description, n.category, n.department))
    .forEach((n) =>
      results.push({
        type: "NOTICE",
        id: n.id,
        title: n.title,
        subtitle: `${n.category} · ${formatDate(n.date)}`,
        to: `/notices/${n.id}`,
      }),
    );

  publicListings(source.listings)
    .filter((l) => hit(l.title, l.description, l.category))
    .forEach((l) =>
      results.push({
        type: "BUY & SELL",
        id: l.id,
        title: l.title,
        subtitle: `${formatPrice(l.price)} · ${l.condition}`,
        to: `/buy-sell/${l.id}`,
      }),
    );

  return results;
}

export const SEARCH_TYPES: SearchResultType[] = [
  "NOTICE",
  "EVENT",
  "CLUB",
  "OPPORTUNITY",
  "BUY & SELL",
];
