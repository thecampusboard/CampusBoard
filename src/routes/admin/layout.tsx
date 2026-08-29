import { Suspense } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Users,
  UserCog,
  Briefcase,
  ShoppingBag,
  ShieldCheck,
  Palette,
  BarChart3,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: boolean;
}

const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/notices", label: "Notices", icon: Megaphone },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/clubs", label: "Clubs", icon: Users },
  { to: "/admin/opportunities", label: "Opportunities", icon: Briefcase },
  { to: "/admin/buy-sell", label: "Buy & Sell", icon: ShoppingBag },
  { to: "/admin/approvals", label: "Approvals", icon: ShieldCheck, badge: true },
  { to: "/admin/users", label: "Users", icon: UserCog },
  { to: "/admin/appearance", label: "Appearance", icon: Palette },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

/**
 * Every /admin/* page renders inside this layout. The admin-only guard
 * lives here (not per-page) so a page can never be reached without it —
 * this is a UX convenience, not the real security boundary: every table's
 * RLS policies (supabase/migrations/001_initial_schema.sql onward) reject
 * an admin-only write from a non-admin session regardless of what this
 * guard does or doesn't render.
 */
export default function AdminLayout() {
  usePageMeta("Admin Dashboard — CampusBoard", "Manage campus content, approvals and appearance.", {
    noindex: true,
  });
  const { user, ready } = useAuth();
  const { pendingNotices, pendingListings } = useContent();
  const pendingCount = pendingNotices.length + pendingListings.length;

  if (!ready) {
    return <div className="bento p-5 text-sm text-muted-foreground sm:p-8">Loading…</div>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="bento p-5 sm:p-8">
        <h1 className="text-2xl font-extrabold">Admin access required</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          Sign in with an admin account to manage campus content.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm font-bold underline">
          Go to login
        </Link>
      </div>
    );
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex min-w-0 items-center gap-2 rounded-xl px-2 py-2.5 text-xs font-bold transition-colors sm:px-3 sm:text-sm",
      isActive
        ? "bg-navy text-navy-foreground"
        : "text-foreground/75 hover:bg-accent hover:text-foreground",
    );

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bento h-fit min-w-0 p-2 sm:p-3 lg:sticky lg:top-20">
        <p className="px-3 pt-1 pb-2 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
          Admin
        </p>
        <nav aria-label="Admin sections">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:block lg:space-y-1">
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end ?? false} className={linkClass}>
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">{item.label}</span>
                {item.badge && pendingCount > 0 ? (
                  <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-orange text-[10px] font-extrabold text-navy">
                    {pendingCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
      <div className="min-w-0 max-w-full">
        {/* Every /admin/* page is a separate lazy-loaded chunk (see App.tsx)
            — this inner boundary lets navigating between admin sections
            (e.g. Notices → Events) show a small loading state in just the
            content area, instead of re-suspending the whole layout/sidebar
            the way a single Suspense around <AdminLayout/> alone would. */}
        <Suspense
          fallback={<div className="bento p-5 text-sm text-muted-foreground sm:p-8">Loading…</div>}
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
