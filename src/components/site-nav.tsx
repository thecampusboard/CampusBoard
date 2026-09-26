import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Home,
  Megaphone,
  CalendarDays,
  Users,
  Briefcase,
  CalendarRange,
  Search,
  UserRound,
  UserPlus,
  LogIn,
  ChevronDown,
  Info,
  Layers,
  Mail,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * SiteNav is the ONE shared navbar for every public page. It's rendered a
 * single time, in App.tsx, above the public route outlet — no page or
 * route below it renders its own header/nav, so there's exactly one navbar
 * implementation and one place to change its behavior, links or styling.
 * (The Admin workspace at /admin uses its own dedicated shell instead —
 * see routes/admin/layout.tsx — matching the high-fidelity admin screens,
 * which show a private app sidebar rather than this public marketing nav.)
 */

const NAV = [
  { to: "/", label: "Home", exact: true, icon: Home },
  { to: "/notices", label: "Notices", exact: false, icon: Megaphone },
  { to: "/events", label: "Events", exact: false, icon: CalendarDays },
  { to: "/clubs", label: "Clubs", exact: false, icon: Users },
  { to: "/chapters", label: "Chapters", exact: false, icon: Layers },
  { to: "/opportunities", label: "Opportunities", exact: false, icon: Briefcase },
  { to: "/calendar", label: "Calendar", exact: false, icon: CalendarRange },
  { to: "/about", label: "About", exact: false, icon: Info },
  { to: "/contact", label: "Contact", exact: false, icon: Mail },
] as const;

/** "Jordan Lee" -> "JL", "Admin" -> "AD". Used for the compact profile control so it never collides visually with the "Admin" panel button. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header
      className={cn(
        // Glassmorphic: translucent + blurred + saturated so content
        // scrolling underneath stays subtly visible, with a hairline
        // border and soft shadow standing in for a hard edge. The base
        // background is the opaque theme colour; only when backdrop-filter
        // is supported is it made translucent (80% — enough that text stays
        // readable over any page background, image or gradient).
        "sticky top-0 z-40 border-b border-border/50 bg-background shadow-[0_4px_24px_-10px_rgba(15,23,42,0.18)]",
        "supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150",
      )}
    >
      {/* Three-column grid: logo left, links truly centred, controls right.
          The two outer columns are equal (1fr) so the centre column sits in
          the exact middle of the bar regardless of how wide either side is. */}
      <nav
        aria-label="Main"
        className="mx-auto grid h-16 max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:h-[72px] sm:px-6 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-6"
      >
        {/* Logo */}
        <Link
          to="/"
          aria-label="CampusBoard home"
          className="inline-flex min-w-0 items-center justify-self-start rounded-lg"
        >
          <BrandLogo size="md" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center justify-center gap-0.5 xl:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
                  isActive && "font-semibold text-primary",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {/* Search */}
          <Link
            to="/search"
            aria-label="Search CampusBoard"
            className="grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-accent hover:text-primary"
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>

          {/* Account controls */}
          {user ? (
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title={user.name}
                    aria-label={`${user.name}'s account menu`}
                    className="flex items-center gap-2"
                  >
                    <span className="font-semibold rounded-full bg-primary text-primary-foreground text-xs flex justify-center items-center size-8">
                      {initials(user.name)}
                    </span>
                    <ChevronDown className="text-muted-foreground size-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2.5 cursor-pointer">
                      <UserRound className="size-4" aria-hidden="true" />
                      My Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "admin" ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2.5 cursor-pointer">
                        <LayoutDashboard className="size-4" aria-hidden="true" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile dashboard shortcut (tablets) */}
          <Link
            to={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/login"}
            aria-label={
              user
                ? user.role === "admin"
                  ? "Open admin dashboard"
                  : "Open dashboard"
                : "Log in to access your dashboard"
            }
            className="grid size-9 shrink-0 place-items-center rounded-full border border-input bg-card text-foreground/75 transition-colors hover:bg-accent hover:text-foreground sm:hidden"
          >
            <LayoutDashboard className="size-[18px]" aria-hidden="true" />
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-input bg-card xl:hidden sm:size-10"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open ? (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border/60 px-4 pb-4 sm:max-h-[calc(100dvh-4.5rem)] xl:hidden">
          <ul className="grid gap-1 pt-3 sm:grid-cols-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.exact}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-2.5",
                        isActive && "bg-accent text-primary font-semibold",
                      )
                    }
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* Account section */}
          <ul className="mt-2 grid gap-1 border-t border-border pt-2 sm:hidden">
            {user ? (
              <>
                <li className="px-3 py-1">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground flex items-center gap-2.5 hover:text-foreground"
                  >
                    <UserRound className="size-4" aria-hidden="true" />
                    My Dashboard
                  </Link>
                </li>
                {user.role === "admin" ? (
                  <li>
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground flex items-center gap-2.5 hover:text-foreground"
                    >
                      <LayoutDashboard className="size-4" aria-hidden="true" />
                      Admin Dashboard
                    </Link>
                  </li>
                ) : null}
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-destructive flex w-full items-center gap-2.5 text-left"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Log out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground flex items-center gap-2.5 hover:text-foreground"
                  >
                    <LogIn className="size-4" aria-hidden="true" />
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground flex items-center gap-2.5 hover:text-foreground"
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    Sign up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <BrandLogo size="sm" />
            <p className="text-sm text-muted-foreground max-w-xs">
              All campus updates, one place. Notices, events, clubs, chapters, and opportunities.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-foreground">Quick Links</p>
              <Link
                to="/notices"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Notices
              </Link>
              <Link
                to="/events"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Events
              </Link>
              <Link
                to="/clubs"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Clubs
              </Link>
              <Link
                to="/chapters"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Chapters
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-foreground">More</p>
              <Link
                to="/opportunities"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Opportunities
              </Link>
              <Link
                to="/calendar"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Calendar
              </Link>
              <Link
                to="/about"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                About
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-foreground">Support</p>
              <Link
                to="/contact"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Contact
              </Link>
              <Link
                to="/search"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Search
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CampusBoard — All Campus Updates, One Place.
          </p>
        </div>
      </div>
    </footer>
  );
}
