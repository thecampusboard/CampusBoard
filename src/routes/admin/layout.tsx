import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Users,
  UserCog,
  Briefcase,
  ShieldCheck,
  Menu,
  ArrowLeftFromLine,
  LogOut,
  School,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: boolean;
}

/**
 * The Admin sidebar/nav — intentionally ONLY these seven sections, matching
 * the high-fidelity admin screens. Buy & Sell moderation, Appearance and
 * Analytics still exist and are still fully reachable (routes are untouched
 * in App.tsx, and Overview links out to Buy & Sell directly) — they're just
 * not primary nav items here, so don't re-add them to this array.
 */
const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/notices", label: "Notices", icon: Megaphone },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/clubs", label: "Clubs", icon: Users },
  { to: "/admin/opportunities", label: "Opportunities", icon: Briefcase },
  { to: "/admin/approvals", label: "Approvals", icon: ShieldCheck, badge: true },
  { to: "/admin/users", label: "Users", icon: UserCog },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

function SidebarNav({
  pendingCount,
  onNavigate,
}: {
  pendingCount: number;
  onNavigate?: () => void;
}) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      <p className="px-3 pb-2 text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
        Admin
      </p>
      {ADMIN_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? false}
          className={linkClass}
          onClick={onNavigate}
        >
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.badge && pendingCount > 0 ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/20 px-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {pendingCount}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Every /admin/* page renders inside this layout. The admin-only guard
 * lives here (not per-page) so a page can never be reached without it —
 * this is a UX convenience, not the real security boundary: every table's
 * RLS policies (supabase/migrations/001_initial_schema.sql onward) reject
 * an admin-only write from a non-admin session regardless of what this
 * guard does or doesn't render.
 *
 * This is a dedicated workspace shell (sidebar + topbar), deliberately
 * separate from the public SiteNav (see components/site-nav.tsx) — the
 * high-fidelity admin screens show a private app sidebar here, not the
 * public marketing nav, and rendering both at once was the "duplicated
 * navbar" this replaces.
 */
export default function AdminLayout() {
  usePageMeta("Admin Dashboard — CampusBoard", "Manage campus content, approvals and appearance.", {
    noindex: true,
  });
  const { user, ready, logout } = useAuth();
  const { pendingNotices, pendingListings } = useContent();
  const pendingCount = pendingNotices.length + pendingListings.length;
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    void logout().then(() => navigate("/"));
  };

  const currentSection =
    ADMIN_NAV.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    )?.label ?? "Overview";

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <Card className="mx-auto max-w-lg border-border/70 p-6 text-center shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Admin access required
          </h1>
          <p className="pt-2 text-sm text-muted-foreground">
            Sign in with an admin account to manage campus content.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Go to login
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-accent"
            >
              Back to CampusBoard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r border-border bg-card p-4 lg:flex">
        <Link to="/" className="flex items-center gap-2 px-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <School className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-foreground">Campus</span>
            <span className="text-primary">Board</span>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav pendingCount={pendingCount} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-primary/5 p-4">
            <p className="text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeftFromLine className="size-4 shrink-0" aria-hidden="true" />
            Back to CampusBoard
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open admin navigation"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <Link
                to="/"
                onClick={() => setMobileNavOpen(false)}
                className="mb-6 flex items-center gap-2 px-1"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <School className="size-5" aria-hidden="true" />
                </span>
                <span className="text-lg font-bold tracking-tight">
                  <span className="text-foreground">Campus</span>
                  <span className="text-primary">Board</span>
                </span>
              </Link>
              <SidebarNav pendingCount={pendingCount} onNavigate={() => setMobileNavOpen(false)} />
              <div className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
                <Link
                  to="/"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ArrowLeftFromLine className="size-4 shrink-0" aria-hidden="true" />
                  Back to CampusBoard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4 shrink-0" aria-hidden="true" />
                  Log out
                </button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">Admin workspace</p>
            <p className="truncate text-sm font-bold text-foreground">{currentSection}</p>
          </div>

          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
            aria-hidden="true"
          >
            {initials(user.name)}
          </span>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense
            fallback={
              <Card className="border-border/70 p-6 text-sm text-muted-foreground sm:p-8">
                Loading section…
              </Card>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
