import ExcelJS from "exceljs";

import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/content";
import { isValidHttpUrl } from "@/lib/utils";
import { NOTICE_CATEGORIES, YEARS, SEMESTERS, ACCENTS, OPPORTUNITY_TYPES } from "@/lib/data";

/**
 * Bulk Excel import for Admin-managed content.
 *
 * Each content type gets its own template/parser/validator — the columns
 * mirror the fields of that type's EXISTING Create/Edit popup exactly (see
 * src/routes/admin/{notices,events,opportunities,clubs}.tsx). Image/file
 * fields are intentionally not part of any template: a row is inserted as
 * a safe draft/pending-review record (reusing the existing status model
 * where one already exists — notices already have `status: 'pending'`;
 * events/opportunities/clubs get the new `is_draft` column added in
 * 013_bulk_import.sql), then Admin opens the row in the SAME popup used
 * everywhere else to attach images, correct anything, and publish.
 */

export type ImportKind = "notices" | "events" | "opportunities" | "clubs";

export interface ImportRowError {
  /** 1-based Excel row number (the header is row 1, so the first data row is 2). */
  row: number;
  field: string;
  problem: string;
}

type RawCell = string | number | boolean | Date | null;
type RawRow = Record<string, RawCell | undefined>;

interface ColumnDef {
  /** Exact header text in the Excel "Data" sheet. */
  key: string;
  required: boolean;
  /** Shown in the template's "Instructions" sheet. */
  hint: string;
}

/* ---------------------------------------------------------------------- */
/* Cell reading helpers                                                    */
/* ---------------------------------------------------------------------- */

function cellString(row: RawRow, key: string): string {
  const v = row[key];
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return isoDate(v);
  return String(v).trim();
}

function cellNumber(row: RawRow, key: string): number | null {
  const v = row[key];
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function cellBoolean(row: RawRow, key: string): boolean {
  const v = row[key];
  if (typeof v === "boolean") return v;
  const s = cellString(row, key).toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

/** Best-effort "YYYY-MM-DD"; returns "" for blank, or the raw trimmed text if it couldn't be parsed (caller reports that as an error). */
function cellDate(row: RawRow, key: string): string {
  const v = row[key];
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return isoDate(v);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? s : isoDate(parsed);
}

/** Best-effort "HH:MM"; returns "" for blank, or the raw trimmed text if it couldn't be parsed. */
function cellTime(row: RawRow, key: string): string {
  const v = row[key];
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    return `${String(v.getHours()).padStart(2, "0")}:${String(v.getMinutes()).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(s);
  return match && match[1] && match[2] ? `${match[1].padStart(2, "0")}:${match[2]}` : s;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitPipeList(value: string): string[] {
  return value
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function rowIsEmpty(raw: RawRow): boolean {
  return Object.values(raw).every((v) => v === null || v === undefined || String(v).trim() === "");
}

function todayIso(): string {
  return isoDate(new Date());
}

/* ---------------------------------------------------------------------- */
/* Column schemas (also drive the downloadable template)                   */
/* ---------------------------------------------------------------------- */

const NOTICE_TEMPLATE: {
  fileBaseName: string;
  sampleRow: (string | number)[];
  columns: ColumnDef[];
} = {
  fileBaseName: "Notices",
  sampleRow: [
    "Mid-semester exam schedule released",
    "The mid-semester examination timetable has been published. Check the attached schedule for your slot.",
    "Examination",
    "Computer Science",
    "2nd Year, 3rd Year",
    "Semester 3, Semester 5",
    todayIso(),
    "",
    "",
    "false",
  ],
  columns: [
    { key: "Title", required: true, hint: "Text" },
    { key: "Description", required: true, hint: "Text" },
    {
      key: "Category",
      required: false,
      hint: `One of: ${NOTICE_CATEGORIES.join(", ")}. Default: General`,
    },
    { key: "Department", required: true, hint: "Text" },
    { key: "Years", required: false, hint: `Comma-separated, from: ${YEARS.join(", ")}` },
    { key: "Semesters", required: false, hint: `Comma-separated, from: ${SEMESTERS.join(", ")}` },
    { key: "Date", required: false, hint: "YYYY-MM-DD. Default: today" },
    {
      key: "Club",
      required: false,
      hint: "Exact name of an existing club, if this notice is from a club",
    },
    { key: "External URL", required: false, hint: "http:// or https:// link, if any" },
    { key: "Featured", required: false, hint: "true or false. Default: false" },
  ],
};

const EVENT_TEMPLATE: {
  fileBaseName: string;
  sampleRow: (string | number)[];
  columns: ColumnDef[];
} = {
  fileBaseName: "Events",
  sampleRow: [
    "Annual Tech Fest",
    "Student Council",
    "",
    todayIso(),
    todayIso(),
    "10:00",
    "17:00",
    "Main Auditorium",
    "A day of talks, workshops, and competitions for all departments.",
    "Open to all students.",
    "",
    "",
    "",
    "blue",
    "false",
  ],
  columns: [
    { key: "Title", required: true, hint: "Text" },
    { key: "Organizer", required: true, hint: "Text" },
    {
      key: "Club",
      required: false,
      hint: "Exact name of an existing club, if this event is hosted by a club",
    },
    { key: "Start Date", required: true, hint: "YYYY-MM-DD" },
    { key: "End Date", required: false, hint: "YYYY-MM-DD, on or after Start Date" },
    { key: "Start Time", required: false, hint: "HH:MM, 24-hour" },
    {
      key: "End Time",
      required: false,
      hint: "HH:MM, 24-hour — must be after Start Time if on the same day",
    },
    { key: "Venue", required: true, hint: "Text" },
    { key: "Description", required: true, hint: "Text" },
    { key: "Eligibility", required: false, hint: "Text. Default: Open to all students." },
    { key: "Registration Deadline", required: false, hint: "YYYY-MM-DD, on or before Start Date" },
    { key: "Registration URL", required: false, hint: "http:// or https:// link, if any" },
    { key: "Contact", required: false, hint: "Text" },
    { key: "Accent Color", required: false, hint: `One of: ${ACCENTS.join(", ")}. Default: blue` },
    { key: "Featured", required: false, hint: "true or false. Default: false" },
  ],
};

const OPPORTUNITY_TEMPLATE: {
  fileBaseName: string;
  sampleRow: (string | number)[];
  columns: ColumnDef[];
} = {
  fileBaseName: "Opportunities",
  sampleRow: [
    "Summer Software Engineering Internship",
    "Acme Corp",
    "Software Engineering Intern",
    "Internship",
    "Remote",
    "Open to all students.",
    "All years",
    "Work with our platform team on real production systems for 10 weeks.",
    "JavaScript, React, SQL",
    "₹25,000/month",
    todayIso(),
    "",
    "purple",
    "false",
  ],
  columns: [
    { key: "Title", required: true, hint: "Text" },
    { key: "Organization", required: true, hint: "Text" },
    { key: "Position", required: true, hint: "Text" },
    {
      key: "Type",
      required: false,
      hint: `One of: ${OPPORTUNITY_TYPES.join(", ")}. Default: Internship`,
    },
    { key: "Location", required: true, hint: "Text" },
    { key: "Eligibility", required: false, hint: "Text. Default: Open to all students." },
    { key: "Years / Branches", required: false, hint: "Text. Default: All years" },
    { key: "Description", required: true, hint: "Text" },
    { key: "Skills", required: false, hint: "Comma-separated" },
    { key: "Stipend", required: false, hint: "Text, e.g. ₹25,000/month" },
    { key: "Deadline", required: true, hint: "YYYY-MM-DD" },
    { key: "Apply URL", required: false, hint: "http:// or https:// link, if any" },
    {
      key: "Accent Color",
      required: false,
      hint: `One of: ${ACCENTS.join(", ")}. Default: purple`,
    },
    { key: "Featured", required: false, hint: "true or false. Default: false" },
  ],
};

const CLUB_TEMPLATE: {
  fileBaseName: string;
  sampleRow: (string | number)[];
  columns: ColumnDef[];
} = {
  fileBaseName: "Clubs",
  sampleRow: [
    "Robotics Club",
    "Building the future, one bot at a time.",
    "We design, build, and compete with autonomous and remote-controlled robots year-round.",
    "navy",
    45,
    "2015",
    "Open at the start of every semester",
    "Won the National Robotics Challenge 2025|Weekly build sessions every Friday",
    "Instagram:https://instagram.com/example|LinkedIn:https://linkedin.com/company/example",
  ],
  columns: [
    { key: "Name", required: true, hint: "Text" },
    { key: "Tagline", required: true, hint: "Short text" },
    { key: "About", required: true, hint: "Text" },
    { key: "Accent Color", required: false, hint: `One of: ${ACCENTS.join(", ")}. Default: navy` },
    { key: "Members", required: false, hint: "Whole number. Default: 0" },
    { key: "Founded", required: false, hint: "Text, e.g. a year" },
    { key: "Recruitment", required: false, hint: "Text" },
    { key: "Announcements", required: false, hint: "Pipe-separated ( | ), one per announcement" },
    {
      key: "Socials",
      required: false,
      hint: "Pipe-separated Label:URL pairs, e.g. Instagram:https://instagram.com/x",
    },
  ],
};

const TEMPLATES: Record<
  ImportKind,
  { fileBaseName: string; sampleRow: (string | number)[]; columns: ColumnDef[] }
> = {
  notices: NOTICE_TEMPLATE,
  events: EVENT_TEMPLATE,
  opportunities: OPPORTUNITY_TEMPLATE,
  clubs: CLUB_TEMPLATE,
};

/* ---------------------------------------------------------------------- */
/* Template download                                                       */
/* ---------------------------------------------------------------------- */

export async function downloadTemplate(kind: ImportKind): Promise<void> {
  const cfg = TEMPLATES[kind];
  const workbook = new ExcelJS.Workbook();

  const dataSheet = workbook.addWorksheet("Data");
  dataSheet.addRow(cfg.columns.map((c) => c.key));
  dataSheet.addRow(cfg.sampleRow);
  dataSheet.getRow(1).font = { bold: true };
  dataSheet.columns.forEach((col) => {
    col.width = 28;
  });

  const instructionsSheet = workbook.addWorksheet("Instructions");
  instructionsSheet.addRow(["Column", "Required", "Format / Allowed values"]);
  instructionsSheet.getRow(1).font = { bold: true };
  cfg.columns.forEach((c) => instructionsSheet.addRow([c.key, c.required ? "Yes" : "No", c.hint]));
  instructionsSheet.addRow([]);
  instructionsSheet.addRow([
    "Row 2 of the Data sheet is a sample — edit or delete it, then add one row per item below the header.",
  ]);
  instructionsSheet.columns.forEach((col) => {
    col.width = 40;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${cfg.fileBaseName}-template.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------------- */
/* Parsing                                                                 */
/* ---------------------------------------------------------------------- */

function normalizeCellValue(value: ExcelJS.CellValue): RawCell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("");
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("result" in value) {
      const result = value.result;
      if (result === undefined) return null;
      return normalizeCellValue(result as ExcelJS.CellValue);
    }
  }
  return String(value);
}

/** Reads the "Data" sheet (or the first sheet, if unnamed) of an uploaded workbook into raw header→value rows. */
export async function parseWorkbook(file: File): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Data") ?? workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: Record<number, string> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = normalizeCellValue(cell.value);
    if (typeof text === "string" && text.trim()) headers[colNumber] = text.trim();
  });

  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw: RawRow = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      raw[header] = normalizeCellValue(cell.value);
    });
    if (Object.keys(raw).length > 0) rows.push(raw);
  });
  return rows;
}

/* ---------------------------------------------------------------------- */
/* Validation — one function per content type, mirroring the fields and    */
/* rules of that type's existing Create/Edit popup.                        */
/* ---------------------------------------------------------------------- */

interface ClubLookup {
  id: string;
  name: string;
}

function resolveClub(
  raw: RawRow,
  row: number,
  clubs: ClubLookup[],
  errors: ImportRowError[],
): { clubId: string | null; ok: boolean } {
  const name = cellString(raw, "Club");
  if (!name) return { clubId: null, ok: true };
  const match = clubs.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
  if (!match) {
    errors.push({ row, field: "Club", problem: `No club named "${name}" was found` });
    return { clubId: null, ok: false };
  }
  return { clubId: match.id, ok: true };
}

function resolveOptionalUrl(
  raw: RawRow,
  row: number,
  field: string,
  errors: ImportRowError[],
): { url: string | null; ok: boolean } {
  const value = cellString(raw, field);
  if (!value) return { url: null, ok: true };
  if (!isValidHttpUrl(value)) {
    errors.push({ row, field, problem: "Must start with http:// or https://" });
    return { url: null, ok: false };
  }
  return { url: value, ok: true };
}

function validateNoticeRows(
  rawRows: RawRow[],
  clubs: ClubLookup[],
  adminId: string,
): { validRows: Record<string, unknown>[]; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];
  const validRows: Record<string, unknown>[] = [];

  rawRows.forEach((raw, i) => {
    if (rowIsEmpty(raw)) return;
    const row = i + 2;
    let ok = true;

    const title = cellString(raw, "Title");
    if (!title) {
      errors.push({ row, field: "Title", problem: "Required" });
      ok = false;
    }
    const description = cellString(raw, "Description");
    if (!description) {
      errors.push({ row, field: "Description", problem: "Required" });
      ok = false;
    }
    const department = cellString(raw, "Department");
    if (!department) {
      errors.push({ row, field: "Department", problem: "Required" });
      ok = false;
    }

    const categoryRaw = cellString(raw, "Category") || "General";
    const category = NOTICE_CATEGORIES.find((c) => c.toLowerCase() === categoryRaw.toLowerCase());
    if (!category) {
      errors.push({
        row,
        field: "Category",
        problem: `Must be one of: ${NOTICE_CATEGORIES.join(", ")}`,
      });
      ok = false;
    }

    const years = splitList(cellString(raw, "Years"));
    const invalidYears = years.filter((y) => !YEARS.includes(y));
    if (invalidYears.length > 0) {
      errors.push({ row, field: "Years", problem: `Unknown value(s): ${invalidYears.join(", ")}` });
      ok = false;
    }

    const semesters = splitList(cellString(raw, "Semesters"));
    const invalidSemesters = semesters.filter((s) => !SEMESTERS.includes(s));
    if (invalidSemesters.length > 0) {
      errors.push({
        row,
        field: "Semesters",
        problem: `Unknown value(s): ${invalidSemesters.join(", ")}`,
      });
      ok = false;
    }

    const dateRaw = cellString(raw, "Date");
    const date = dateRaw ? cellDate(raw, "Date") : todayIso();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ row, field: "Date", problem: "Must be a valid date (YYYY-MM-DD)" });
      ok = false;
    }

    const club = resolveClub(raw, row, clubs, errors);
    ok = ok && club.ok;

    const externalUrl = resolveOptionalUrl(raw, row, "External URL", errors);
    ok = ok && externalUrl.ok;

    const featured = cellBoolean(raw, "Featured");

    if (!ok) return;
    validRows.push({
      id: slugify(title),
      title,
      description,
      category: category ?? "General",
      department,
      years,
      semesters,
      date,
      club_id: club.clubId,
      external_url: externalUrl.url,
      featured,
      created_by: adminId,
      status: "pending",
    });
  });

  return { validRows, errors };
}

function validateEventRows(
  rawRows: RawRow[],
  clubs: ClubLookup[],
  adminId: string,
): { validRows: Record<string, unknown>[]; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];
  const validRows: Record<string, unknown>[] = [];

  rawRows.forEach((raw, i) => {
    if (rowIsEmpty(raw)) return;
    const row = i + 2;
    let ok = true;

    const title = cellString(raw, "Title");
    if (!title) {
      errors.push({ row, field: "Title", problem: "Required" });
      ok = false;
    }
    const organizer = cellString(raw, "Organizer");
    if (!organizer) {
      errors.push({ row, field: "Organizer", problem: "Required" });
      ok = false;
    }
    const venue = cellString(raw, "Venue");
    if (!venue) {
      errors.push({ row, field: "Venue", problem: "Required" });
      ok = false;
    }
    const description = cellString(raw, "Description");
    if (!description) {
      errors.push({ row, field: "Description", problem: "Required" });
      ok = false;
    }

    const startDateRaw = cellString(raw, "Start Date");
    const startDate = cellDate(raw, "Start Date");
    if (!startDateRaw || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      errors.push({
        row,
        field: "Start Date",
        problem: "Required, must be a valid date (YYYY-MM-DD)",
      });
      ok = false;
    }

    const endDateRaw = cellString(raw, "End Date");
    const endDate = endDateRaw ? cellDate(raw, "End Date") : "";
    if (endDateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      errors.push({ row, field: "End Date", problem: "Must be a valid date (YYYY-MM-DD)" });
      ok = false;
    } else if (endDate && startDate && endDate < startDate) {
      errors.push({ row, field: "End Date", problem: "Must be on or after Start Date" });
      ok = false;
    }

    const startTime = cellTime(raw, "Start Time");
    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
      errors.push({ row, field: "Start Time", problem: "Must be a valid time (HH:MM)" });
      ok = false;
    }
    const endTime = cellTime(raw, "End Time");
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
      errors.push({ row, field: "End Time", problem: "Must be a valid time (HH:MM)" });
      ok = false;
    } else if (
      startTime &&
      endTime &&
      /^\d{2}:\d{2}$/.test(startTime) &&
      /^\d{2}:\d{2}$/.test(endTime) &&
      (!endDate || endDate === startDate) &&
      endTime <= startTime
    ) {
      errors.push({ row, field: "End Time", problem: "Must be after Start Time" });
      ok = false;
    }

    const registrationDeadlineRaw = cellString(raw, "Registration Deadline");
    const registrationDeadline = registrationDeadlineRaw
      ? cellDate(raw, "Registration Deadline")
      : "";
    if (registrationDeadlineRaw && !/^\d{4}-\d{2}-\d{2}$/.test(registrationDeadline)) {
      errors.push({
        row,
        field: "Registration Deadline",
        problem: "Must be a valid date (YYYY-MM-DD)",
      });
      ok = false;
    } else if (registrationDeadline && startDate && registrationDeadline > startDate) {
      errors.push({
        row,
        field: "Registration Deadline",
        problem: "Must be on or before Start Date",
      });
      ok = false;
    }

    const eligibility = cellString(raw, "Eligibility") || "Open to all students.";

    const accentRaw = cellString(raw, "Accent Color") || "blue";
    const accent = ACCENTS.find((a) => a.toLowerCase() === accentRaw.toLowerCase());
    if (!accent) {
      errors.push({ row, field: "Accent Color", problem: `Must be one of: ${ACCENTS.join(", ")}` });
      ok = false;
    }

    const club = resolveClub(raw, row, clubs, errors);
    ok = ok && club.ok;

    const registrationUrl = resolveOptionalUrl(raw, row, "Registration URL", errors);
    ok = ok && registrationUrl.ok;

    const contact = cellString(raw, "Contact");
    const featured = cellBoolean(raw, "Featured");

    if (!ok) return;
    validRows.push({
      id: slugify(title),
      title,
      organizer,
      club_id: club.clubId,
      date: startDate,
      end_date: endDate || null,
      time: startTime ? `${startTime}${endTime ? ` – ${endTime}` : ""}` : null,
      start_time: startTime || null,
      end_time: endTime || null,
      venue,
      description,
      eligibility,
      registration_deadline: registrationDeadline || null,
      registration_url: registrationUrl.url ?? "#",
      contact: contact || null,
      accent: accent ?? "blue",
      featured,
      created_by: adminId,
      is_draft: true,
    });
  });

  return { validRows, errors };
}

function validateOpportunityRows(
  rawRows: RawRow[],
  adminId: string,
): { validRows: Record<string, unknown>[]; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];
  const validRows: Record<string, unknown>[] = [];

  rawRows.forEach((raw, i) => {
    if (rowIsEmpty(raw)) return;
    const row = i + 2;
    let ok = true;

    const title = cellString(raw, "Title");
    if (!title) {
      errors.push({ row, field: "Title", problem: "Required" });
      ok = false;
    }
    const organization = cellString(raw, "Organization");
    if (!organization) {
      errors.push({ row, field: "Organization", problem: "Required" });
      ok = false;
    }
    const position = cellString(raw, "Position");
    if (!position) {
      errors.push({ row, field: "Position", problem: "Required" });
      ok = false;
    }
    const location = cellString(raw, "Location");
    if (!location) {
      errors.push({ row, field: "Location", problem: "Required" });
      ok = false;
    }
    const description = cellString(raw, "Description");
    if (!description) {
      errors.push({ row, field: "Description", problem: "Required" });
      ok = false;
    }

    const typeRaw = cellString(raw, "Type") || "Internship";
    const type = OPPORTUNITY_TYPES.find((t) => t.toLowerCase() === typeRaw.toLowerCase());
    if (!type) {
      errors.push({
        row,
        field: "Type",
        problem: `Must be one of: ${OPPORTUNITY_TYPES.join(", ")}`,
      });
      ok = false;
    }

    const accentRaw = cellString(raw, "Accent Color") || "purple";
    const accent = ACCENTS.find((a) => a.toLowerCase() === accentRaw.toLowerCase());
    if (!accent) {
      errors.push({ row, field: "Accent Color", problem: `Must be one of: ${ACCENTS.join(", ")}` });
      ok = false;
    }

    const deadlineRaw = cellString(raw, "Deadline");
    const deadline = cellDate(raw, "Deadline");
    if (!deadlineRaw || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      errors.push({
        row,
        field: "Deadline",
        problem: "Required, must be a valid date (YYYY-MM-DD)",
      });
      ok = false;
    }

    const applyUrl = resolveOptionalUrl(raw, row, "Apply URL", errors);
    ok = ok && applyUrl.ok;

    const eligibility = cellString(raw, "Eligibility") || "Open to all students.";
    const yearsBranches = cellString(raw, "Years / Branches") || "All years";
    const skills = splitList(cellString(raw, "Skills"));
    const stipend = cellString(raw, "Stipend");
    const featured = cellBoolean(raw, "Featured");

    if (!ok) return;
    validRows.push({
      id: slugify(title),
      title,
      organization,
      position,
      type: type ?? "Internship",
      location,
      eligibility,
      years_branches: yearsBranches,
      description,
      skills,
      stipend: stipend || null,
      deadline,
      apply_url: applyUrl.url ?? "#",
      accent: accent ?? "purple",
      featured,
      created_by: adminId,
      is_draft: true,
    });
  });

  return { validRows, errors };
}

function validateClubRows(rawRows: RawRow[]): {
  validRows: Record<string, unknown>[];
  errors: ImportRowError[];
} {
  const errors: ImportRowError[] = [];
  const validRows: Record<string, unknown>[] = [];

  rawRows.forEach((raw, i) => {
    if (rowIsEmpty(raw)) return;
    const row = i + 2;
    let ok = true;

    const name = cellString(raw, "Name");
    if (!name) {
      errors.push({ row, field: "Name", problem: "Required" });
      ok = false;
    }
    const tagline = cellString(raw, "Tagline");
    if (!tagline) {
      errors.push({ row, field: "Tagline", problem: "Required" });
      ok = false;
    }
    const about = cellString(raw, "About");
    if (!about) {
      errors.push({ row, field: "About", problem: "Required" });
      ok = false;
    }

    const accentRaw = cellString(raw, "Accent Color") || "navy";
    const accent = ACCENTS.find((a) => a.toLowerCase() === accentRaw.toLowerCase());
    if (!accent) {
      errors.push({ row, field: "Accent Color", problem: `Must be one of: ${ACCENTS.join(", ")}` });
      ok = false;
    }

    const membersRaw = cellString(raw, "Members");
    const members = membersRaw ? cellNumber(raw, "Members") : 0;
    if (members === null || members < 0) {
      errors.push({ row, field: "Members", problem: "Must be a whole number, 0 or greater" });
      ok = false;
    }

    const founded = cellString(raw, "Founded");
    const recruitment = cellString(raw, "Recruitment");
    const announcements = splitPipeList(cellString(raw, "Announcements"));

    const socialsRaw = splitPipeList(cellString(raw, "Socials"));
    const socials: { label: string; url: string }[] = [];
    for (const part of socialsRaw) {
      const idx = part.indexOf(":");
      const label = idx > 0 ? part.slice(0, idx).trim() : "";
      const url = idx > 0 ? part.slice(idx + 1).trim() : "";
      if (!label || !isValidHttpUrl(url)) {
        errors.push({
          row,
          field: "Socials",
          problem: `"${part}" must be Label:URL with a valid http:// or https:// URL`,
        });
        ok = false;
      } else {
        socials.push({ label, url });
      }
    }

    if (!ok) return;
    validRows.push({
      id: slugify(name),
      name,
      tagline,
      about,
      accent: accent ?? "navy",
      members: members ?? 0,
      founded: founded || null,
      recruitment: recruitment || null,
      announcements,
      gallery: [],
      socials,
      past_events: [],
      is_draft: true,
    });
  });

  return { validRows, errors };
}

export interface ParsedImport {
  /** Non-blank rows found in the sheet, before validation. */
  totalRows: number;
  validRows: Record<string, unknown>[];
  errors: ImportRowError[];
}

export function parseAndValidate(
  kind: ImportKind,
  rawRows: RawRow[],
  clubs: ClubLookup[],
  adminId: string,
): ParsedImport {
  const totalRows = rawRows.filter((r) => !rowIsEmpty(r)).length;
  const result =
    kind === "notices"
      ? validateNoticeRows(rawRows, clubs, adminId)
      : kind === "events"
        ? validateEventRows(rawRows, clubs, adminId)
        : kind === "opportunities"
          ? validateOpportunityRows(rawRows, adminId)
          : validateClubRows(rawRows);
  return { totalRows, validRows: result.validRows, errors: result.errors };
}

/* ---------------------------------------------------------------------- */
/* Duplicate-file detection + bookkeeping                                  */
/* ---------------------------------------------------------------------- */

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface ExistingBatch {
  id: string;
  createdAt: string;
  totalRows: number;
}

/** Looks for a prior import of this exact file (by content hash) for this content type, so the dialog can warn before creating duplicate rows. */
export async function findExistingBatch(
  kind: ImportKind,
  fileHash: string,
): Promise<ExistingBatch | null> {
  const { data, error } = await supabase
    .from("import_batches")
    .select("id, created_at, total_rows")
    .eq("entity_type", kind)
    .eq("file_hash", fileHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; created_at: string; total_rows: number };
  return { id: row.id, createdAt: row.created_at, totalRows: row.total_rows };
}

export async function createImportBatch(
  kind: ImportKind,
  fileName: string,
  fileHash: string,
  totals: { total: number; valid: number; errors: number },
  adminId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("import_batches")
    .insert({
      entity_type: kind,
      file_name: fileName,
      file_hash: fileHash,
      total_rows: totals.total,
      valid_rows: totals.valid,
      error_rows: totals.errors,
      created_by: adminId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not start the import.");
  return (data as { id: string }).id;
}

async function recordImportedCount(batchId: string, importedRows: number): Promise<void> {
  try {
    await supabase.from("import_batches").update({ imported_rows: importedRows }).eq("id", batchId);
  } catch {
    // Best-effort bookkeeping only — doesn't affect the rows already inserted.
  }
}

/* ---------------------------------------------------------------------- */
/* Insertion                                                               */
/* ---------------------------------------------------------------------- */

export interface ImportInsertFailure {
  title: string;
  message: string;
}

/**
 * Inserts each valid row individually (rather than one bulk call) so a
 * single bad row — e.g. one that passed client-side checks but still trips
 * a database constraint — doesn't block the rest of a good import, and so
 * every failure can be reported against the specific row that caused it.
 */
export async function insertRows(
  kind: ImportKind,
  batchId: string,
  rows: Record<string, unknown>[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ insertedCount: number; failures: ImportInsertFailure[] }> {
  let insertedCount = 0;
  const failures: ImportInsertFailure[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row) {
      const { error } = await supabase.from(kind).insert(row);
      if (error) {
        const title =
          typeof row["title"] === "string"
            ? row["title"]
            : typeof row["name"] === "string"
              ? row["name"]
              : `Row ${i + 1}`;
        failures.push({ title, message: error.message });
      } else {
        insertedCount++;
      }
    }
    onProgress?.(i + 1, rows.length);
  }

  await recordImportedCount(batchId, insertedCount);
  return { insertedCount, failures };
}
