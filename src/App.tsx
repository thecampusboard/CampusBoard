import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import { Routes, Route, Link, Outlet, useNavigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/lib/auth";
import { ContentProvider } from "@/lib/content";
import { usePageMeta, useSiteStructuredData } from "@/lib/seo";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { Toaster } from "@/components/ui/sonner";
import { AdvertisementPopup } from "@/components/advertisement-popup";

import Home from "@/routes/index";
import AboutPage from "@/routes/about";
import Notices from "@/routes/notices";
import NoticeDetail from "@/routes/notices.$noticeId";
import Events from "@/routes/events";
import EventDetail from "@/routes/events.$eventId";
import Clubs from "@/routes/clubs";
import ClubDetail from "@/routes/clubs.$clubId";
import Chapters from "@/routes/chapters";
import ChapterDetail from "@/routes/chapters.$chapterId";
import Opportunities from "@/routes/opportunities";
import OpportunityDetail from "@/routes/opportunities.$opportunityId";
import CalendarPage from "@/routes/calendar";
import BuySell from "@/routes/buy-sell";
import ListingDetail from "@/routes/buy-sell.$listingId";
import SearchPage from "@/routes/search";
import ContactPage from "@/routes/contact";
import LoginPage from "@/routes/login";
import SignupPage from "@/routes/signup";
import AuthCallbackPage from "@/routes/auth.callback";

// Code-split: the entire /admin/* subtree and the Buy & Sell posting wizard
// are only ever needed by Admin or by a student actively listing an item —
// a small slice of visits. Splitting them into their own chunk keeps the
// bundle every ordinary visitor downloads smaller (see the "chunks larger
// than 500 kB" build warning this addresses) without touching any of their
// behavior.
const BuySellNew = lazy(() => import("@/routes/buy-sell.new"));
const DashboardPage = lazy(() => import("@/routes/dashboard"));
const AdminLayout = lazy(() => import("@/routes/admin/layout"));
const AdminOverviewPage = lazy(() => import("@/routes/admin/overview"));
const AdminNoticesPage = lazy(() => import("@/routes/admin/notices"));
const AdminEventsPage = lazy(() => import("@/routes/admin/events"));
const AdminClubsPage = lazy(() => import("@/routes/admin/clubs"));
const AdminChaptersPage = lazy(() => import("@/routes/admin/chapters"));
const AdminInterestsPage = lazy(() => import("@/routes/admin/interests"));
const AdminAdvertisementsPage = lazy(() => import("@/routes/admin/advertisements"));
const AdminOpportunitiesPage = lazy(() => import("@/routes/admin/opportunities"));
const AdminBuySellPage = lazy(() => import("@/routes/admin/buy-sell"));
const AdminApprovalsPage = lazy(() => import("@/routes/admin/approvals"));
const AdminUsersPage = lazy(() => import("@/routes/admin/users"));
const AdminAppearancePage = lazy(() => import("@/routes/admin/appearance"));
const AdminAnalyticsPage = lazy(() => import("@/routes/admin/analytics"));

function RouteFallback() {
  return (
    <div
      className="flex items-center justify-center p-12 text-sm text-muted-foreground"
      role="status"
    >
      <div className="flex items-center gap-2">
        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading…
      </div>
    </div>
  );
}

function NotFoundPage() {
  usePageMeta("Page not found — CampusBoard", "This page doesn't exist or has been archived.", {
    noindex: true,
  });
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-bold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist or has been archived.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={onReset}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            onClick={() => navigate("/")}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-input bg-card px-5 text-sm font-bold text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  override render() {
    if (this.state.error) {
      return <ErrorFallback onReset={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

/**
 * Shell for every PUBLIC page (and the signed-in student's own /dashboard,
 * which — per the high-fidelity screens — keeps the same public nav rather
 * than getting a private app shell): the one shared SiteNav, the content
 * outlet, and SiteFooter. /admin/* deliberately does NOT use this — see
 * routes/admin/layout.tsx for why.
 */
function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 pt-5 pb-10 sm:px-6 sm:pt-6 lg:px-8">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <SiteFooter />
      <AdvertisementPopup />
    </div>
  );
}

export default function App() {
  useSiteStructuredData();
  return (
    <AuthProvider>
      <ContentProvider>
        <Routes>
          <Route element={<PublicShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/notices/:noticeId" element={<NoticeDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/:clubId" element={<ClubDetail />} />
            <Route path="/chapters" element={<Chapters />} />
            <Route path="/chapters/:chapterId" element={<ChapterDetail />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/opportunities/:opportunityId" element={<OpportunityDetail />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/buy-sell" element={<BuySell />} />
            <Route
              path="/buy-sell/new"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <BuySellNew />
                </Suspense>
              }
            />
            <Route path="/buy-sell/:listingId" element={<ListingDetail />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* The Admin workspace gets its own dedicated shell (sidebar +
              topbar) instead of the public SiteNav — see
              routes/admin/layout.tsx. It has its own internal error
              boundary too, so a crash inside one admin page doesn't take
              down the whole app either. */}
          <Route
            path="/admin"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ErrorBoundary>
                  <AdminLayout />
                </ErrorBoundary>
              </Suspense>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="overview" element={<AdminOverviewPage />} />
            <Route path="notices" element={<AdminNoticesPage />} />
            <Route path="events" element={<AdminEventsPage />} />
            <Route path="clubs" element={<AdminClubsPage />} />
            <Route path="chapters" element={<AdminChaptersPage />} />
            <Route path="interests" element={<AdminInterestsPage />} />
            <Route path="advertisements" element={<AdminAdvertisementsPage />} />
            <Route path="opportunities" element={<AdminOpportunitiesPage />} />
            <Route path="buy-sell" element={<AdminBuySellPage />} />
            <Route path="approvals" element={<AdminApprovalsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="appearance" element={<AdminAppearancePage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
          </Route>
        </Routes>
        <Toaster />
        <Analytics />
      </ContentProvider>
    </AuthProvider>
  );
}
