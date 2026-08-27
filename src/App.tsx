import { Component, type ErrorInfo, type ReactNode } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";

import { AuthProvider } from "@/lib/auth";
import { ContentProvider } from "@/lib/content";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { Toaster } from "@/components/ui/sonner";

import Home from "@/routes/index";
import Notices from "@/routes/notices";
import NoticeDetail from "@/routes/notices.$noticeId";
import Events from "@/routes/events";
import EventDetail from "@/routes/events.$eventId";
import Clubs from "@/routes/clubs";
import ClubDetail from "@/routes/clubs.$clubId";
import Opportunities from "@/routes/opportunities";
import OpportunityDetail from "@/routes/opportunities.$opportunityId";
import CalendarPage from "@/routes/calendar";
import BuySell from "@/routes/buy-sell";
import BuySellNew from "@/routes/buy-sell.new";
import ListingDetail from "@/routes/buy-sell.$listingId";
import SearchPage from "@/routes/search";
import LoginPage from "@/routes/login";
import SignupPage from "@/routes/signup";
import AuthCallbackPage from "@/routes/auth.callback";
import AdminLayout from "@/routes/admin/layout";
import AdminOverviewPage from "@/routes/admin/overview";
import AdminNoticesPage from "@/routes/admin/notices";
import AdminEventsPage from "@/routes/admin/events";
import AdminClubsPage from "@/routes/admin/clubs";
import AdminOpportunitiesPage from "@/routes/admin/opportunities";
import AdminBuySellPage from "@/routes/admin/buy-sell";
import AdminApprovalsPage from "@/routes/admin/approvals";
import AdminAppearancePage from "@/routes/admin/appearance";
import AdminAnalyticsPage from "@/routes/admin/analytics";
import DashboardPage from "@/routes/dashboard";

function NotFoundPage() {
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
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground"
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
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground"
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

export default function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <div className="flex min-h-screen flex-col">
          <SiteNav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/notices" element={<Notices />} />
                <Route path="/notices/:noticeId" element={<NoticeDetail />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:eventId" element={<EventDetail />} />
                <Route path="/clubs" element={<Clubs />} />
                <Route path="/clubs/:clubId" element={<ClubDetail />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/opportunities/:opportunityId" element={<OpportunityDetail />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/buy-sell" element={<BuySell />} />
                <Route path="/buy-sell/new" element={<BuySellNew />} />
                <Route path="/buy-sell/:listingId" element={<ListingDetail />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="notices" element={<AdminNoticesPage />} />
                  <Route path="events" element={<AdminEventsPage />} />
                  <Route path="clubs" element={<AdminClubsPage />} />
                  <Route path="opportunities" element={<AdminOpportunitiesPage />} />
                  <Route path="buy-sell" element={<AdminBuySellPage />} />
                  <Route path="approvals" element={<AdminApprovalsPage />} />
                  <Route path="appearance" element={<AdminAppearancePage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                </Route>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <SiteFooter />
        </div>
        <Toaster />
      </ContentProvider>
    </AuthProvider>
  );
}
