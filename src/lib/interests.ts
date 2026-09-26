/**
 * "Interested to Join" submissions for Clubs and Chapters
 * (supabase/migrations/019_community_interests.sql).
 *
 * This is NOT membership. It is a lead a student leaves for Admin to follow
 * up on; nothing here adds anyone to a club or chapter.
 */

export type InterestKind = "club" | "chapter";
export type InterestStatus = "new" | "contacted" | "archived";

export const INTEREST_STATUSES: { value: InterestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "archived", label: "Archived" },
];

export interface InterestRow {
  id: string;
  kind: InterestKind;
  club_id: string | null;
  chapter_id: string | null;
  user_id: string;
  student_name: string;
  student_email: string;
  phone: string | null;
  course_year: string | null;
  message: string | null;
  status: InterestStatus;
  created_at: string;
  clubs: { name: string } | null;
  chapters: { name: string } | null;
}

export const INTEREST_COLUMNS =
  "id, kind, club_id, chapter_id, user_id, student_name, student_email, phone, course_year, message, status, created_at, clubs(name), chapters(name)";

/** Postgres unique-violation code, returned when the student already has a submission for this target. */
export const UNIQUE_VIOLATION = "23505";
