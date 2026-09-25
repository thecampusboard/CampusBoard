import {
  Bot,
  Mic,
  Code2,
  Cpu,
  Camera,
  Trophy,
  HeartPulse,
  Sparkles,
  ShieldCheck,
  Palette,
  Rocket,
  HeartHandshake,
  BookOpen,
  Calculator,
  Laptop,
  Headphones,
  Bike,
  Lamp,
  Package,
  Briefcase,
  ClipboardList,
  Building2,
  Library,
  GraduationCap,
  FlaskConical,
  Presentation,
  Users,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Vector icon vocabulary for CampusBoard content.
 * Every card uses a line icon instead of text initials.
 */

const EVENT_ICONS: Record<string, LucideIcon> = {
  "technova-2k26": Sparkles,
  robowars: Bot,
  "open-mic-night": Mic,
  "code-clash-3": Code2,
  "ai-workshop": Cpu,
  "photography-auditions": Camera,
  "basketball-trials": Trophy,
  "blood-donation-camp": HeartPulse,
};

const CLUB_ICONS: Record<string, LucideIcon> = {
  robominds: Bot,
  cybersentinels: ShieldCheck,
  pratibimbh: Palette,
  avishkarnam: Rocket,
  nss: HeartHandshake,
  "sports-council": Trophy,
};

const LISTING_ICONS: Record<string, LucideIcon> = {
  "engg-maths-book": BookOpen,
  "casio-calculator": Calculator,
  "dell-inspiron-15": Laptop,
  "boat-rockerz-450": Headphones,
  "cycle-hero-sprint": Bike,
  "study-table-lamp": Lamp,
};

const LISTING_CATEGORY_ICONS: Record<string, LucideIcon> = {
  Books: BookOpen,
  Electronics: Laptop,
  Stationery: ClipboardList,
  Hostel: Lamp,
  Other: Package,
};

const NOTICE_ICONS: Record<string, LucideIcon> = {
  Placement: Briefcase,
  Examination: ClipboardList,
  Department: Building2,
  General: Library,
  Academic: GraduationCap,
  Other: FileText,
};

const OPPORTUNITY_ICONS: Record<string, LucideIcon> = {
  Internship: Briefcase,
  Job: Building2,
  Hackathon: Code2,
  Competition: Trophy,
  Research: FlaskConical,
  Fellowship: GraduationCap,
  Workshop: Presentation,
  Conference: Users,
};

export const eventIcon = (id: string): LucideIcon => EVENT_ICONS[id] ?? Sparkles;
export const clubIcon = (id: string): LucideIcon => CLUB_ICONS[id] ?? Users;
export const listingIcon = (id: string, category?: string): LucideIcon =>
  LISTING_ICONS[id] ?? (category ? LISTING_CATEGORY_ICONS[category] : undefined) ?? Package;
export const noticeIcon = (category: string): LucideIcon => NOTICE_ICONS[category] ?? FileText;
export const opportunityIcon = (type: string): LucideIcon => OPPORTUNITY_ICONS[type] ?? Briefcase;
