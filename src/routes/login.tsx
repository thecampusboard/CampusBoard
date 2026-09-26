import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

import { AuthActionError, useAuth } from "@/lib/auth";
import { isValidHttpUrl, readPendingExternalAction, safeRedirectPath } from "@/lib/utils";
import { usePageMeta } from "@/lib/seo";
import { GoogleIcon } from "@/components/google-icon";
import {
  clearLoginAttempts,
  formatLockoutRemaining,
  loginLockoutRemaining,
  recordFailedLogin,
} from "@/lib/rate-limit";

export default function LoginPage() {
  const { login, loginWithGoogle, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect"));
  const action = searchParams.get("action") ?? undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle(redirect);
      // Browser is redirected to Google here; this component unmounts.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
      setGoogleSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendState("sending");
    try {
      await resendVerification(email);
      setResendState("sent");
    } catch {
      setResendState("idle");
      setError("Could not resend the verification email. Try again shortly.");
    }
  };

  usePageMeta(
    "Login — CampusBoard",
    "Sign in to register for events, apply to opportunities and view seller contacts.",
    { noindex: true },
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid college email and your password.");
      return;
    }
    const lockoutMs = loginLockoutRemaining(email);
    if (lockoutMs > 0) {
      setError(
        `Too many failed attempts for this email. Try again in ${formatLockoutRemaining(lockoutMs)}.`,
      );
      return;
    }
    setError(null);
    setShowResend(false);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      clearLoginAttempts(email);
      const pending = readPendingExternalAction();
      if (pending && isValidHttpUrl(pending.href)) {
        window.location.assign(pending.href);
        return;
      }
      if (redirect) {
        navigate(redirect, { replace: true });
        return;
      }
      navigate(user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      if (err instanceof AuthActionError && err.code === "email_not_confirmed") {
        setShowResend(true);
        setError(err.message);
      } else {
        recordFailedLogin(email);
        setError(err instanceof Error ? err.message : "Could not log you in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="shadow-bento rounded-2xl bg-card border border-border p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="rounded-xl bg-primary text-primary-foreground flex justify-center items-center size-10">
            <span className="font-bold text-sm">CB</span>
          </div>
          <span className="font-bold text-lg">Campus<span className="text-primary">Board</span></span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          {action
            ? `Sign in to continue to "${action}".`
            : "Reading is always free. Sign in for registrations, applications and seller contacts."}
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleSubmitting}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-input bg-card text-sm font-bold text-foreground disabled:opacity-60 hover:bg-accent transition-colors"
        >
          <GoogleIcon className="size-4" />
          {googleSubmitting ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="text-sm font-bold">
              College email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@campus.edu"
              className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-bold">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-input bg-background px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" aria-hidden="true" />
                ) : (
                  <Eye className="size-[18px]" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}
          {showResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendState !== "idle"}
              className="text-sm font-bold text-primary hover:underline disabled:opacity-60"
            >
              {resendState === "sent"
                ? "Verification email sent — check your inbox."
                : resendState === "sending"
                  ? "Sending…"
                  : "Resend verification email"}
            </button>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Logging in…" : "Login"}
          </button>
        </form>

        <p className="pt-4 text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-bold text-primary">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
