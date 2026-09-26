import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { isValidHttpUrl, readPendingExternalAction, safeRedirectPath } from "@/lib/utils";
import { usePageMeta } from "@/lib/seo";

/**
 * Landing page for the Supabase Google OAuth redirect (see
 * VITE_SUPABASE_URL / Supabase Authentication → URL Configuration →
 * Redirect URLs, and README for the exact setup steps).
 *
 * The Supabase client (createClient's default `detectSessionInUrl: true`)
 * parses the `?code=` in this page's own URL and exchanges it for a session
 * automatically, which fires the `onAuthStateChange` listener in
 * AuthProvider. We just wait here for that to land, then send the user on
 * to wherever they were headed (?redirect=...) or home.
 */
import { Card } from "@/components/ui/card";

export default function AuthCallbackPage() {
  usePageMeta("Signing you in — CampusBoard", "Completing Google sign-in.", { noindex: true });

  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const redirected = useRef(false);

  useEffect(() => {
    const errorDescription = searchParams.get("error_description") ?? searchParams.get("error");
    if (errorDescription) {
      setOauthError(errorDescription);
    }
  }, [searchParams]);

  useEffect(() => {
    if (oauthError || redirected.current || !ready) return;
    const redirectPath = safeRedirectPath(searchParams.get("redirect"));
    const timeout = setTimeout(
      () => {
        if (redirected.current) return;
        redirected.current = true;
        const pending = readPendingExternalAction();
        if (pending && isValidHttpUrl(pending.href)) {
          window.location.assign(pending.href);
          return;
        }
        navigate(redirectPath || (user?.role === "admin" ? "/admin" : "/"), { replace: true });
      },
      user ? 0 : 1500,
    );
    return () => clearTimeout(timeout);
  }, [ready, user, oauthError, searchParams, navigate]);

  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="p-6 text-center sm:p-8 border-border/70 shadow-sm">
        {oauthError ? (
          <>
            <h1 className="text-xl font-display font-extrabold tracking-tight">Sign-in failed</h1>
            <p className="pt-2 text-sm text-destructive">{oauthError}</p>
            <a
              href="/login"
              className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Back to login
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto size-10 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
            <h1 className="text-xl font-display font-extrabold tracking-tight">Signing you in…</h1>
            <p className="pt-2 text-sm text-muted-foreground">
              Completing authentication. This should only take a moment.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
