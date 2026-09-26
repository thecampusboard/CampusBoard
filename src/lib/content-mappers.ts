import type { CampusEvent, Club, Listing, Notice, Opportunity } from "@/lib/data";

/**
 * Supabase rows are snake_case (matching the SQL in supabase/migrations/);
 * the rest of the app expects the camelCase shapes in src/lib/data.ts. These
 * mappers are the only place that translation happens.
 */

// Minimal row shapes — only the columns this app reads/writes.
export interface NoticeRow {
  id: string;
  title: string;
  description: string;
  category: Notice["category"];
  department: string;
  years: string[];
  semesters: string[];
  date: string;
  file_type: Notice["fileType"];
  file_label: string | null;
  external_url: string | null;
  file_path: string | null;
  featured: boolean | null;
  views: number;
  status: Notice["status"];
  created_by: string | null;
  club_id: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  organizer: string;
  club_id: string | null;
  date: string;
  end_date: string | null;
  time: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string;
  description: string;
  eligibility: string;
  registration_deadline: string | null;
  registration_url: string;
  contact: string | null;
  accent: CampusEvent["accent"];
  featured: boolean | null;
  views: number;
  register_clicks: number;
  is_draft: boolean | null;
  status: CampusEvent["status"];
  created_by: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
}

export interface ClubRow {
  id: string;
  name: string;
  tagline: string;
  about: string;
  accent: Club["accent"];
  members: number;
  founded: string | null;
  recruitment: string | null;
  announcements: string[];
  gallery: string[];
  socials: { label: string; url: string }[];
  past_events: { title: string; date: string }[];
  head_name: string | null;
  faculty_lead: string | null;
  image_path: string | null;
  is_draft: boolean | null;
}

export interface OpportunityRow {
  id: string;
  title: string;
  organization: string;
  position: string;
  type: Opportunity["type"];
  location: string;
  eligibility: string;
  years_branches: string;
  description: string;
  skills: string[];
  stipend: string | null;
  deadline: string;
  apply_url: string;
  accent: Opportunity["accent"];
  featured: boolean | null;
  views: number;
  apply_clicks: number;
  is_draft: boolean | null;
  status: Opportunity["status"];
  created_by: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
}

export interface ListingRow {
  id: string;
  owner_id: string;
  listing_type: Listing["listingType"];
  title: string;
  price: number;
  condition: Listing["condition"];
  category: Listing["category"];
  description: string;
  seller_name: string;
  /** Null when masked by buy_sell_listings_public for a non-owner/non-admin caller. */
  seller_phone: string | null;
  images: string[];
  payment_screenshot_path: string | null;
  status: Listing["status"];
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  views: number;
  contact_reveals: number;
  created_at: string;
}

export const fromNoticeRow = (r: NoticeRow): Notice => ({
  id: r.id,
  title: r.title,
  description: r.description,
  category: r.category,
  department: r.department,
  years: r.years ?? [],
  semesters: r.semesters ?? [],
  date: r.date,
  fileType: r.file_type,
  ...(r.file_label ? { fileLabel: r.file_label } : {}),
  ...(r.external_url ? { externalUrl: r.external_url } : {}),
  ...(r.file_path ? { filePath: r.file_path } : {}),
  featured: r.featured ?? false,
  views: r.views,
  status: r.status,
  ...(r.created_by ? { createdBy: r.created_by } : {}),
  ...(r.club_id ? { clubId: r.club_id } : {}),
  ...(r.rejection_reason ? { rejectionReason: r.rejection_reason } : {}),
  ...(r.reviewed_at ? { reviewedAt: r.reviewed_at } : {}),
});

export const fromEventRow = (r: EventRow): CampusEvent => ({
  id: r.id,
  title: r.title,
  organizer: r.organizer,
  ...(r.club_id ? { clubId: r.club_id } : {}),
  date: r.date,
  ...(r.end_date ? { endDate: r.end_date } : {}),
  ...(r.start_time ? { startTime: r.start_time.slice(0, 5) } : {}),
  ...(r.end_time ? { endTime: r.end_time.slice(0, 5) } : {}),
  ...(r.time ? { time: r.time } : {}),
  venue: r.venue,
  description: r.description,
  eligibility: r.eligibility,
  ...(r.registration_deadline ? { registrationDeadline: r.registration_deadline } : {}),
  registrationUrl: r.registration_url,
  ...(r.contact ? { contact: r.contact } : {}),
  accent: r.accent,
  featured: r.featured ?? false,
  views: r.views,
  registerClicks: r.register_clicks,
  isDraft: r.is_draft ?? false,
  status: r.status,
  ...(r.created_by ? { createdBy: r.created_by } : {}),
  ...(r.rejection_reason ? { rejectionReason: r.rejection_reason } : {}),
  ...(r.reviewed_at ? { reviewedAt: r.reviewed_at } : {}),
});

export const fromClubRow = (r: ClubRow): Club => ({
  id: r.id,
  name: r.name,
  tagline: r.tagline,
  about: r.about,
  accent: r.accent,
  members: r.members,
  founded: r.founded ?? "",
  recruitment: r.recruitment ?? "",
  announcements: r.announcements ?? [],
  gallery: r.gallery ?? [],
  socials: r.socials ?? [],
  pastEvents: r.past_events ?? [],
  ...(r.head_name ? { headName: r.head_name } : {}),
  ...(r.faculty_lead ? { facultyLead: r.faculty_lead } : {}),
  ...(r.image_path ? { imagePath: r.image_path } : {}),
  isDraft: r.is_draft ?? false,
});

export const fromOpportunityRow = (r: OpportunityRow): Opportunity => ({
  id: r.id,
  title: r.title,
  organization: r.organization,
  position: r.position,
  type: r.type,
  location: r.location,
  eligibility: r.eligibility,
  yearsBranches: r.years_branches,
  description: r.description,
  skills: r.skills ?? [],
  ...(r.stipend ? { stipend: r.stipend } : {}),
  deadline: r.deadline,
  applyUrl: r.apply_url,
  accent: r.accent,
  featured: r.featured ?? false,
  views: r.views,
  applyClicks: r.apply_clicks,
  isDraft: r.is_draft ?? false,
  status: r.status,
  ...(r.created_by ? { createdBy: r.created_by } : {}),
  ...(r.rejection_reason ? { rejectionReason: r.rejection_reason } : {}),
  ...(r.reviewed_at ? { reviewedAt: r.reviewed_at } : {}),
});

export const fromListingRow = (r: ListingRow): Listing => ({
  id: r.id,
  listingType: r.listing_type,
  title: r.title,
  price: Number(r.price),
  condition: r.condition,
  category: r.category,
  description: r.description,
  sellerName: r.seller_name,
  sellerPhone: r.seller_phone ?? "",
  postedOn: r.created_at.slice(0, 10),
  accent: "yellow",
  views: r.views,
  contactReveals: r.contact_reveals,
  status: r.status,
  ownerId: r.owner_id,
  images: r.images ?? [],
  ...(r.payment_screenshot_path ? { paymentScreenshotPath: r.payment_screenshot_path } : {}),
  ...(r.submitted_at ? { submittedOn: r.submitted_at.slice(0, 10) } : {}),
  ...(r.approved_at ? { approvedOn: r.approved_at.slice(0, 10) } : {}),
  ...(r.rejection_reason ? { rejectionReason: r.rejection_reason } : {}),
});
