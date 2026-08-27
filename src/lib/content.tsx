import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { CampusEvent, Club, Listing, Notice, Opportunity } from "@/lib/data";
import { isValidHttpUrl } from "@/lib/utils";
import {
  fromClubRow,
  fromEventRow,
  fromListingRow,
  fromNoticeRow,
  fromOpportunityRow,
} from "@/lib/content-mappers";
import type {
  ClubRow,
  EventRow,
  ListingRow,
  NoticeRow,
  OpportunityRow,
} from "@/lib/content-mappers";

/**
 * CampusBoard content store — Supabase is the single source of truth.
 * Every read goes through PostgREST (`supabase-js`), which is subject to the
 * RLS policies in supabase/migrations/001_initial_schema.sql: a plain
 * `select *` on buy_sell_listings already returns exactly the rows the
 * current session is allowed to see (public approved+active listings, plus
 * the caller's own rows, plus everything if they're Admin — Postgres ORs
 * permissive policies together). Writes are guarded the same way: the
 * `enforce_listing_transition`/`enforce_notice_review` triggers and the
 * admin-only policies on notices/events/clubs/opportunities reject anything
 * the session isn't allowed to do — the `user?.role !== "admin"` checks
 * below are for a fast, friendly error message, not the real enforcement
 * boundary.
 */

/** Admin-managed homepage appearance — hero background + campus gallery. Both are storage object paths in the public `content-images` bucket. */
export interface CollegeHoliday {
  id: string;
  date: string;
  name: string;
  description?: string;
}

export interface SiteAppearance {
  heroImagePath: string | null;
  campusGalleryPaths: string[];
  holidays: CollegeHoliday[];
}

const DEFAULT_APPEARANCE: SiteAppearance = { heroImagePath: null, campusGalleryPaths: [], holidays: [] };

/** Every table `remove`/typed-update can target. Kept as a union (not a free string) so a caller can't typo a table name past the compiler. */
export type ManagedEntity = "notices" | "events" | "clubs" | "opportunities" | "buy_sell_listings";

type NoticeContentPatch = Partial<
  Pick<
    Notice,
    | "title"
    | "description"
    | "category"
    | "department"
    | "years"
    | "semesters"
    | "date"
    | "fileType"
    | "fileLabel"
    | "externalUrl"
    | "filePath"
    | "clubId"
  >
>;

interface ContentValue {
  notices: Notice[];
  events: CampusEvent[];
  clubs: Club[];
  opportunities: Opportunity[];
  listings: Listing[];
  /** Buy & Sell submissions awaiting Admin approval. Populated for Admin only. */
  pendingListings: Listing[];
  /** Notice submissions awaiting Admin approval. Populated for Admin only. */
  pendingNotices: Notice[];
  /** Homepage hero image + campus gallery. Falls back to DEFAULT_APPEARANCE (no custom image) until an Admin configures one. */
  appearance: SiteAppearance;
  loading: boolean;
  /** Set when the last refresh() failed to load one or more tables. Null once a refresh succeeds. */
  error: string | null;
  refresh: () => Promise<void>;
  /** Admin updates the homepage hero/campus-gallery images. Merges with the existing value — pass only the field(s) that changed. */
  updateAppearance: (patch: Partial<SiteAppearance>) => Promise<void>;
  /** Admin creates a notice — publishes immediately (status defaults to 'approved'). */
  addNotice: (
    n: Omit<
      Notice,
      "views" | "status" | "createdBy" | "reviewedAt" | "rejectionReason"
    >,
  ) => Promise<void>;
  /** Admin edits any notice's content. Does not touch status/review fields — use reviewNotice for that. */
  updateNotice: (id: string, patch: NoticeContentPatch) => Promise<void>;
  /** Student submits a notice for review — always starts 'pending'; Admin must approve it. */
  submitNotice: (
    n: Omit<
      Notice,
      | "views"
      | "status"
      | "createdBy"
      | "reviewedAt"
      | "rejectionReason"
      | "featured"
    >,
  ) => Promise<void>;
  /** Student edits the content of their OWN pending/rejected notice and resubmits it — always lands back at 'pending' for a fresh review. */
  resubmitNotice: (id: string, patch: NoticeContentPatch) => Promise<void>;
  /** Admin approves or rejects a pending notice. A reason is required to reject. */
  reviewNotice: (id: string, decision: "approved" | "rejected", reason?: string) => Promise<void>;
  addEvent: (e: Omit<CampusEvent, "views" | "registerClicks">) => Promise<void>;
  updateEvent: (id: string, patch: Partial<Omit<CampusEvent, "id" | "views" | "registerClicks">>) => Promise<void>;
  addClub: (c: Club) => Promise<void>;
  updateClub: (id: string, patch: Partial<Omit<Club, "id">>) => Promise<void>;
  addOpportunity: (o: Omit<Opportunity, "views" | "applyClicks">) => Promise<void>;
  updateOpportunity: (
    id: string,
    patch: Partial<Omit<Opportunity, "id" | "views" | "applyClicks">>,
  ) => Promise<void>;
  /** Student submits a new Buy & Sell listing — starts as payment_pending. */
  addListing: (
    l: Pick<
      Listing,
      | "id"
      | "listingType"
      | "title"
      | "price"
      | "condition"
      | "category"
      | "description"
      | "sellerName"
      | "sellerPhone"
    > & { images?: string[] },
  ) => Promise<void>;
  /** Admin edits any listing's content. Does not touch status/approval fields — use approveListing/rejectListing for that. */
  updateListing: (
    id: string,
    patch: Partial<
      Pick<
        Listing,
        "title" | "price" | "condition" | "category" | "description" | "sellerName" | "sellerPhone" | "images"
      >
    >,
  ) => Promise<void>;
  /** Student marks the UPI payment as completed. */
  markPaymentCompleted: (id: string) => Promise<void>;
  /** Student uploads their payment screenshot (storage path) — moves to pending_approval. */
  submitPaymentScreenshot: (id: string, screenshotPath: string) => Promise<void>;
  /** Admin approves a pending listing, starting its 30-day window. */
  approveListing: (id: string) => Promise<void>;
  /** Admin rejects a pending listing. A reason is required. */
  rejectListing: (id: string, reason: string) => Promise<void>;
  /** Deletes one row from one table — pass the table the record actually belongs to, so this is a single targeted delete rather than a blind sweep across every content table. RLS still rejects anything the session isn't allowed to delete. */
  remove: (entity: ManagedEntity, id: string) => Promise<void>;
}

const ContentContext = createContext<ContentValue | null>(null);

export function slugify(value: string) {
  return (
    (value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "item") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

const NOTICE_COLUMNS =
  "id, title, description, category, department, years, semesters, date, file_type, file_label, external_url, file_path, featured, views, status, created_by, club_id, rejection_reason, reviewed_at";
const EVENT_COLUMNS =
  "id, title, organizer, club_id, date, end_date, time, start_time, end_time, venue, description, eligibility, registration_deadline, registration_url, contact, accent, featured, views, register_clicks";
const CLUB_COLUMNS =
  "id, name, tagline, about, accent, members, founded, recruitment, announcements, gallery, socials, past_events, image_path";
const OPPORTUNITY_COLUMNS =
  "id, title, organization, position, type, location, eligibility, years_branches, description, skills, stipend, deadline, apply_url, accent, featured, views, apply_clicks";
const LISTING_COLUMNS =
  "id, owner_id, listing_type, title, price, condition, category, description, seller_name, seller_phone, images, payment_screenshot_path, status, rejection_reason, submitted_at, approved_at, views, contact_reveals, created_at";

function throwIfError<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [appearance, setAppearance] = useState<SiteAppearance>(DEFAULT_APPEARANCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [noticesRes, eventsRes, clubsRes, opportunitiesRes, listingsRes, appearanceRes] =
      await Promise.all([
        supabase.from("notices").select(NOTICE_COLUMNS).order("date", { ascending: false }),
        supabase.from("events").select(EVENT_COLUMNS).order("date", { ascending: true }),
        supabase.from("clubs").select(CLUB_COLUMNS).order("name", { ascending: true }),
        supabase
          .from("opportunities")
          .select(OPPORTUNITY_COLUMNS)
          .order("deadline", { ascending: true }),
        supabase
          .from("buy_sell_listings_public")
          .select(LISTING_COLUMNS)
          .order("created_at", { ascending: false }),
        supabase.from("site_settings").select("value").eq("key", "appearance").maybeSingle(),
      ]);

    const failures: string[] = [];
    if (!noticesRes.error) setNotices(((noticesRes.data ?? []) as NoticeRow[]).map(fromNoticeRow));
    else failures.push("notices");
    if (!eventsRes.error) setEvents(((eventsRes.data ?? []) as EventRow[]).map(fromEventRow));
    else failures.push("events");
    if (!clubsRes.error) setClubs(((clubsRes.data ?? []) as ClubRow[]).map(fromClubRow));
    else failures.push("clubs");
    if (!opportunitiesRes.error)
      setOpportunities(((opportunitiesRes.data ?? []) as OpportunityRow[]).map(fromOpportunityRow));
    else failures.push("opportunities");
    if (!listingsRes.error)
      setListings(((listingsRes.data ?? []) as ListingRow[]).map(fromListingRow));
    else failures.push("Buy & Sell listings");
    if (!appearanceRes.error && appearanceRes.data) {
      const v = appearanceRes.data.value as Partial<SiteAppearance> | null;
      setAppearance({
        heroImagePath: v?.heroImagePath ?? null,
        campusGalleryPaths: Array.isArray(v?.campusGalleryPaths) ? v.campusGalleryPaths : [],
        holidays: Array.isArray(v?.holidays)
          ? v.holidays.filter(
              (h): h is CollegeHoliday =>
                !!h && typeof h === "object" && typeof (h as CollegeHoliday).id === "string" && typeof (h as CollegeHoliday).date === "string" && typeof (h as CollegeHoliday).name === "string",
            )
          : [],
      });
    } else if (appearanceRes.error) failures.push("appearance");

    setError(failures.length > 0 ? `Couldn't load: ${failures.join(", ")}.` : null);
  }, []);

  useEffect(() => {
    // Re-fetch once auth is settled so RLS-dependent rows (own/pending
    // listings, admin-visible rows) reflect the signed-in session.
    if (!ready) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [ready, user?.id, refresh]);

  const value = useMemo<ContentValue>(
    () => ({
      notices,
      events,
      clubs,
      opportunities,
      listings,
      pendingListings: listings.filter((l) => l.status === "pending_approval"),
      pendingNotices: notices.filter((n) => n.status === "pending"),
      appearance,
      loading,
      error,
      refresh,

      updateAppearance: async (patch) => {
        if (user?.role !== "admin") throw new Error("Only Admin can change site appearance.");
        const next = { ...appearance, ...patch };
        throwIfError(
          await supabase
            .from("site_settings")
            .upsert(
              { key: "appearance", value: next, updated_by: user.id },
              { onConflict: "key" },
            ),
        );
        setAppearance(next);
      },

      addNotice: async (n) => {
        if (user?.role !== "admin") throw new Error("Only Admin can create a notice.");
        throwIfError(
          await supabase.from("notices").insert({
            id: n.id,
            title: n.title,
            description: n.description,
            category: n.category,
            department: n.department,
            years: n.years,
            semesters: n.semesters,
            date: n.date,
            file_type: n.fileType,
            file_label: n.fileLabel ?? null,
            external_url: n.externalUrl?.trim() || null,
            file_path: n.filePath ?? null,
            featured: n.featured ?? false,
            club_id: n.clubId ?? null,
            created_by: user.id,
            status: "approved",
          }),
        );
        await refresh();
      },

      updateNotice: async (id, patch) => {
        if (user?.role !== "admin") throw new Error("Only Admin can edit a notice.");
        const row: Record<string, unknown> = {};
        if (patch.title !== undefined) row["title"] = patch.title;
        if (patch.description !== undefined) row["description"] = patch.description;
        if (patch.category !== undefined) row["category"] = patch.category;
        if (patch.department !== undefined) row["department"] = patch.department;
        if (patch.years !== undefined) row["years"] = patch.years;
        if (patch.semesters !== undefined) row["semesters"] = patch.semesters;
        if (patch.date !== undefined) row["date"] = patch.date;
        if (patch.fileType !== undefined) row["file_type"] = patch.fileType;
        if (patch.fileLabel !== undefined) row["file_label"] = patch.fileLabel || null;
        if (patch.externalUrl !== undefined) row["external_url"] = patch.externalUrl || null;
        if (patch.filePath !== undefined) row["file_path"] = patch.filePath || null;
        if (patch.clubId !== undefined) row["club_id"] = patch.clubId || null;
        throwIfError(await supabase.from("notices").update(row).eq("id", id));
        await refresh();
      },

      submitNotice: async (n) => {
        if (!user) throw new Error("Login to submit a notice.");
        if (n.externalUrl && !isValidHttpUrl(n.externalUrl.trim())) throw new Error("External URL must start with http:// or https://.");
        throwIfError(
          await supabase.from("notices").insert({
            id: n.id,
            title: n.title,
            description: n.description,
            category: n.category,
            department: n.department,
            years: n.years,
            semesters: n.semesters,
            date: n.date,
            file_type: n.fileType,
            file_label: n.fileLabel ?? null,
            external_url: n.externalUrl?.trim() || null,
            file_path: n.filePath ?? null,
            club_id: n.clubId ?? null,
            created_by: user.id,
            status: "pending",
          }),
        );
        await refresh();
      },

      resubmitNotice: async (id, patch) => {
        if (!user) throw new Error("Login to resubmit a notice.");
        if (patch.externalUrl && !isValidHttpUrl(patch.externalUrl.trim())) throw new Error("External URL must start with http:// or https://.");
        const row: Record<string, unknown> = { status: "pending" };
        if (patch.title !== undefined) row["title"] = patch.title;
        if (patch.description !== undefined) row["description"] = patch.description;
        if (patch.category !== undefined) row["category"] = patch.category;
        if (patch.department !== undefined) row["department"] = patch.department;
        if (patch.years !== undefined) row["years"] = patch.years;
        if (patch.semesters !== undefined) row["semesters"] = patch.semesters;
        if (patch.date !== undefined) row["date"] = patch.date;
        if (patch.fileType !== undefined) row["file_type"] = patch.fileType;
        if (patch.fileLabel !== undefined) row["file_label"] = patch.fileLabel || null;
        if (patch.externalUrl !== undefined) row["external_url"] = patch.externalUrl || null;
        if (patch.filePath !== undefined) row["file_path"] = patch.filePath || null;
        throwIfError(await supabase.from("notices").update(row).eq("id", id).eq("created_by", user.id));
        await refresh();
      },

      reviewNotice: async (id, decision, reason) => {
        if (user?.role !== "admin") throw new Error("Only Admin can review a notice.");
        if (decision === "rejected" && !reason?.trim()) {
          throw new Error("A rejection reason is required.");
        }
        throwIfError(
          await supabase
            .from("notices")
            .update({
              status: decision,
              rejection_reason: decision === "rejected" ? reason!.trim() : null,
            })
            .eq("id", id),
        );
        await refresh();
      },

      addEvent: async (e) => {
        if (user?.role !== "admin") throw new Error("Only Admin can create an event.");
        if (e.registrationUrl && e.registrationUrl !== "#" && !isValidHttpUrl(e.registrationUrl.trim())) {
          throw new Error("Registration URL must start with http:// or https://.");
        }
        throwIfError(
          await supabase.from("events").insert({
            id: e.id,
            title: e.title,
            organizer: e.organizer,
            club_id: e.clubId ?? null,
            date: e.date,
            end_date: e.endDate ?? null,
            time:
              e.time ??
              (e.startTime
                ? `${e.startTime}${e.endTime ? ` – ${e.endTime}` : ""}`
                : null),
            start_time: e.startTime ?? null,
            end_time: e.endTime ?? null,
            venue: e.venue,
            description: e.description,
            eligibility: e.eligibility,
            registration_deadline: e.registrationDeadline ?? null,
            registration_url: e.registrationUrl?.trim() || "#",
            contact: e.contact ?? null,
            accent: e.accent,
            featured: e.featured ?? false,
            created_by: user.id,
          }),
        );
        await refresh();
      },

      updateEvent: async (id, patch) => {
        if (user?.role !== "admin") throw new Error("Only Admin can edit an event.");
        if (patch.registrationUrl && patch.registrationUrl !== "#" && !isValidHttpUrl(patch.registrationUrl.trim())) {
          throw new Error("Registration URL must start with http:// or https://.");
        }
        const row: Record<string, unknown> = {};
        if (patch.title !== undefined) row["title"] = patch.title;
        if (patch.organizer !== undefined) row["organizer"] = patch.organizer;
        if (patch.clubId !== undefined) row["club_id"] = patch.clubId || null;
        if (patch.date !== undefined) row["date"] = patch.date;
        if (patch.endDate !== undefined) row["end_date"] = patch.endDate || null;
        if (patch.time !== undefined) row["time"] = patch.time || null;
        if (patch.startTime !== undefined) row["start_time"] = patch.startTime || null;
        if (patch.endTime !== undefined) row["end_time"] = patch.endTime || null;
        if (patch.startTime !== undefined) {
          row["time"] = patch.startTime
            ? `${patch.startTime}${patch.endTime ? ` – ${patch.endTime}` : ""}`
            : null;
        }
        if (patch.venue !== undefined) row["venue"] = patch.venue;
        if (patch.description !== undefined) row["description"] = patch.description;
        if (patch.eligibility !== undefined) row["eligibility"] = patch.eligibility;
        if (patch.registrationDeadline !== undefined)
          row["registration_deadline"] = patch.registrationDeadline || null;
        if (patch.registrationUrl !== undefined) row["registration_url"] = patch.registrationUrl?.trim() || "#";
        if (patch.contact !== undefined) row["contact"] = patch.contact || null;
        if (patch.accent !== undefined) row["accent"] = patch.accent;
        if (patch.featured !== undefined) row["featured"] = patch.featured;
        throwIfError(await supabase.from("events").update(row).eq("id", id));
        await refresh();
      },

      addClub: async (c) => {
        if (user?.role !== "admin") throw new Error("Only Admin can create a club.");
        throwIfError(
          await supabase.from("clubs").insert({
            id: c.id,
            name: c.name,
            tagline: c.tagline,
            about: c.about,
            accent: c.accent,
            members: c.members,
            founded: c.founded || null,
            recruitment: c.recruitment || null,
            announcements: c.announcements ?? [],
            gallery: c.gallery ?? [],
            socials: c.socials ?? [],
            past_events: c.pastEvents ?? [],
            image_path: c.imagePath ?? null,
          }),
        );
        await refresh();
      },

      updateClub: async (id, patch) => {
        if (user?.role !== "admin") throw new Error("Only Admin can edit a club.");
        const row: Record<string, unknown> = {};
        if (patch.name !== undefined) row["name"] = patch.name;
        if (patch.tagline !== undefined) row["tagline"] = patch.tagline;
        if (patch.about !== undefined) row["about"] = patch.about;
        if (patch.accent !== undefined) row["accent"] = patch.accent;
        if (patch.members !== undefined) row["members"] = patch.members;
        if (patch.founded !== undefined) row["founded"] = patch.founded || null;
        if (patch.recruitment !== undefined) row["recruitment"] = patch.recruitment || null;
        if (patch.announcements !== undefined) row["announcements"] = patch.announcements;
        if (patch.gallery !== undefined) row["gallery"] = patch.gallery;
        if (patch.socials !== undefined) row["socials"] = patch.socials;
        if (patch.pastEvents !== undefined) row["past_events"] = patch.pastEvents;
        if (patch.imagePath !== undefined) row["image_path"] = patch.imagePath || null;
        throwIfError(await supabase.from("clubs").update(row).eq("id", id));
        await refresh();
      },

      addOpportunity: async (o) => {
        if (user?.role !== "admin") throw new Error("Only Admin can create an opportunity.");
        if (o.applyUrl && o.applyUrl !== "#" && !isValidHttpUrl(o.applyUrl.trim())) throw new Error("Application URL must start with http:// or https://.");
        throwIfError(
          await supabase.from("opportunities").insert({
            id: o.id,
            title: o.title,
            organization: o.organization,
            position: o.position,
            type: o.type,
            location: o.location,
            eligibility: o.eligibility,
            years_branches: o.yearsBranches,
            description: o.description,
            skills: o.skills ?? [],
            stipend: o.stipend ?? null,
            deadline: o.deadline,
            apply_url: o.applyUrl?.trim() || "#",
            accent: o.accent,
            featured: o.featured ?? false,
            created_by: user.id,
          }),
        );
        await refresh();
      },

      updateOpportunity: async (id, patch) => {
        if (user?.role !== "admin") throw new Error("Only Admin can edit an opportunity.");
        if (patch.applyUrl && patch.applyUrl !== "#" && !isValidHttpUrl(patch.applyUrl.trim())) throw new Error("Application URL must start with http:// or https://.");
        const row: Record<string, unknown> = {};
        if (patch.title !== undefined) row["title"] = patch.title;
        if (patch.organization !== undefined) row["organization"] = patch.organization;
        if (patch.position !== undefined) row["position"] = patch.position;
        if (patch.type !== undefined) row["type"] = patch.type;
        if (patch.location !== undefined) row["location"] = patch.location;
        if (patch.eligibility !== undefined) row["eligibility"] = patch.eligibility;
        if (patch.yearsBranches !== undefined) row["years_branches"] = patch.yearsBranches;
        if (patch.description !== undefined) row["description"] = patch.description;
        if (patch.skills !== undefined) row["skills"] = patch.skills;
        if (patch.stipend !== undefined) row["stipend"] = patch.stipend || null;
        if (patch.deadline !== undefined) row["deadline"] = patch.deadline;
        if (patch.applyUrl !== undefined) row["apply_url"] = patch.applyUrl?.trim() || "#";
        if (patch.accent !== undefined) row["accent"] = patch.accent;
        if (patch.featured !== undefined) row["featured"] = patch.featured;
        throwIfError(await supabase.from("opportunities").update(row).eq("id", id));
        await refresh();
      },

      addListing: async (l) => {
        if (!user) throw new Error("Login to post a Buy & Sell listing.");
        throwIfError(
          await supabase.from("buy_sell_listings").insert({
            id: l.id,
            owner_id: user.id,
            listing_type: l.listingType,
            title: l.title,
            price: l.price,
            condition: l.condition,
            category: l.category,
            description: l.description,
            seller_name: l.sellerName,
            seller_phone: l.sellerPhone,
            images: l.images ?? [],
            status: "payment_pending",
          }),
        );
        await refresh();
      },

      updateListing: async (id, patch) => {
        if (user?.role !== "admin") throw new Error("Only Admin can edit a listing.");
        const row: Record<string, unknown> = {};
        if (patch.title !== undefined) row["title"] = patch.title;
        if (patch.price !== undefined) row["price"] = patch.price;
        if (patch.condition !== undefined) row["condition"] = patch.condition;
        if (patch.category !== undefined) row["category"] = patch.category;
        if (patch.description !== undefined) row["description"] = patch.description;
        if (patch.sellerName !== undefined) row["seller_name"] = patch.sellerName;
        if (patch.sellerPhone !== undefined) row["seller_phone"] = patch.sellerPhone;
        if (patch.images !== undefined) row["images"] = patch.images;
        throwIfError(await supabase.from("buy_sell_listings").update(row).eq("id", id));
        await refresh();
      },

      markPaymentCompleted: async (id) => {
        throwIfError(
          await supabase
            .from("buy_sell_listings")
            .update({ status: "payment_submitted" })
            .eq("id", id),
        );
        await refresh();
      },

      submitPaymentScreenshot: async (id, screenshotPath) => {
        throwIfError(
          await supabase
            .from("buy_sell_listings")
            .update({ status: "pending_approval", payment_screenshot_path: screenshotPath })
            .eq("id", id),
        );
        await refresh();
      },

      approveListing: async (id) => {
        if (user?.role !== "admin") throw new Error("Only Admin can approve a listing.");
        throwIfError(
          await supabase
            .from("buy_sell_listings")
            .update({ status: "approved", rejection_reason: null })
            .eq("id", id),
        );
        await refresh();
      },

      rejectListing: async (id, reason) => {
        if (user?.role !== "admin") throw new Error("Only Admin can reject a listing.");
        if (!reason?.trim()) throw new Error("A rejection reason is required.");
        throwIfError(
          await supabase
            .from("buy_sell_listings")
            .update({ status: "rejected", rejection_reason: reason.trim() })
            .eq("id", id),
        );
        await refresh();
      },

      remove: async (entity, id) => {
        throwIfError(await supabase.from(entity).delete().eq("id", id));
        await refresh();
      },
    }),
    [notices, events, clubs, opportunities, listings, appearance, loading, error, refresh, user],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used inside ContentProvider");
  return ctx;
}
