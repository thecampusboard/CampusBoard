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
  ShoppingBag,
  Search,
  UserRound,
  UserPlus,
  LogIn,
  ChevronDown,
  Info,
} from "lucide-react";
import { useState } from "react";

import campusBoardLogo from "@/assets/campusboard-logo.png";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Home", exact: true, icon: Home },
  { to: "/notices", label: "Notices", exact: false, icon: Megaphone },
  { to: "/events", label: "Events", exact: false, icon: CalendarDays },
  { to: "/clubs", label: "Clubs", exact: false, icon: Users },
  { to: "/opportunities", label: "Opportunities", exact: false, icon: Briefcase },
  { to: "/calendar", label: "Calendar", exact: false, icon: CalendarRange },
  { to: "/buy-sell", label: "Buy & Sell", exact: false, icon: ShoppingBag },
  { to: "/about", label: "About", exact: false, icon: Info },
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

  const linkClass =
    "rounded-lg px-2.5 py-2 text-[13px] font-bold text-foreground/75 transition-colors hover:text-foreground xl:px-3";

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 px-3 py-3 sm:px-6 sm:py-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-2 lg:px-8"
      >
        <Link
          to="/"
          aria-label="CampusBoard home"
          className="inline-flex min-w-0 items-center gap-2 justify-self-start text-xl font-extrabold tracking-tight text-foreground sm:gap-2.5 sm:text-2xl"
        >
          <img
            src={campusBoardLogo}
            alt=""
            aria-hidden="true"
            className="size-7 shrink-0 object-contain sm:size-8"
          />
          <span className="truncate">
            Campus<span className="text-blue">Board</span>
          </span>
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                cn(linkClass, isActive && "text-foreground underline underline-offset-8")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-self-end gap-1.5">
          {/* Search — the ONLY control that goes to /search. */}
          <Link
            to="/search"
            aria-label="Search CampusBoard"
            className="grid size-9 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-accent hover:text-foreground sm:size-10"
          >
            <Search className="size-[18px]" aria-hidden="true" />
          </Link>

          {/* Account controls — visible from sm up; the same actions are
              reachable from the mobile menu below, so nothing here is
              desktop-only functionality. One control per account, not
              three: Dashboard, Admin (if applicable) and Logout all live
              inside a single dropdown so there's never a separate
              "Admin"/profile/logout trio competing for attention. */}
          {user ? (
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title={user.name}
                    aria-label={`${user.name}'s account menu`}
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-foreground/25 bg-card pr-2.5 pl-1 text-[13px] font-bold transition-colors hover:bg-accent"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy text-[12px] text-navy-foreground">
                      {initials(user.name)}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
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
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                to="/login"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-foreground/30 bg-card px-5 text-[13px] font-bold transition-colors hover:bg-foreground hover:text-background"
              >
                <UserRound className="size-4" aria-hidden="true" />
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-navy px-5 text-[13px] font-bold text-navy-foreground transition-colors hover:bg-navy/90"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Sign up
              </Link>
            </div>
          )}

          <Link
            to={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/login"}
            aria-label={
              user
                ? user.role === "admin"
                  ? "Open admin dashboard"
                  : "Open dashboard"
                : "Log in to access your dashboard"
            }
            title={user ? (user.role === "admin" ? "Admin dashboard" : "Dashboard") : "Dashboard"}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-foreground/20 bg-card text-foreground/75 transition-colors hover:bg-accent hover:text-foreground sm:size-10 lg:hidden"
          >
            <LayoutDashboard className="size-[18px]" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-foreground/20 bg-card lg:hidden sm:size-10"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-border bg-card px-4 pb-4 lg:hidden">
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
                        linkClass,
                        "flex items-center gap-2.5",
                        isActive && "bg-accent text-foreground",
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

          {/* Account section — full width, always reachable, this is what
              keeps Dashboard/Admin/Login/Signup/Logout from being
              desktop-only. */}
          <ul className="mt-2 grid gap-1 border-t border-border pt-2 sm:hidden">
            {user ? (
              <>
                <li className="px-2.5 py-1">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className={cn(linkClass, "flex items-center gap-2.5")}
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
                      className={cn(linkClass, "flex items-center gap-2.5")}
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
                    className={cn(
                      linkClass,
                      "flex w-full items-center gap-2.5 text-left text-destructive",
                    )}
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
                    className={cn(linkClass, "flex items-center gap-2.5")}
                  >
                    <LogIn className="size-4" aria-hidden="true" />
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    onClick={() => setOpen(false)}
                    className={cn(linkClass, "flex items-center gap-2.5")}
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
    <footer className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="bento flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold">
          © {new Date().getFullYear()} Campus<span className="text-blue">Board</span> — All Campus
          Updates, At One Place.
        </p>
        {/* <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Content published by the campus administration and students.
          </p>
        </div> */}
      </div>
    </footer>
  );
}
