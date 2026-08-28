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
    // `ready` only tells us the initial session check resolved; give the
    // OAuth code-exchange a brief window to complete and update `user`
    // before giving up and sending the person back to /login.
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
    <div className="mx-auto max-w-md py-8">
      <div className="bento p-6 text-center sm:p-8">
        {oauthError ? (
          <>
            <h1 className="text-xl font-extrabold">Sign-in failed</h1>
            <p className="pt-2 text-sm text-muted-foreground">{oauthError}</p>
            <a
              href="/login"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90"
            >
              Back to login
            </a>
          </>
        ) : (
          <>
            <h1 className="text-xl font-extrabold">Signing you in…</h1>
            <p className="pt-2 text-sm text-muted-foreground">
              Completing sign-in with Google. This should only take a moment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
