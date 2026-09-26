import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";

import { AuthActionError, useAuth } from "@/lib/auth";
import { usePageMeta } from "@/lib/seo";
import { GoogleIcon } from "@/components/google-icon";
import { BrandLogo } from "@/components/brand-logo";
import { isPasswordStrong, passwordRequirementResults } from "@/lib/password";

export default function SignupPage() {
  usePageMeta(
    "Sign up — CampusBoard",
    "Create a CampusBoard student account to show interest in clubs and chapters and submit campus updates.",
    { noindex: true },
  );

  const { signUp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleGoogleSignup = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      // Browser is redirected to Google here; this component unmounts.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
      setGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes("@")) {
      setError("Fill in your name and a valid college email.");
      return;
    }
    if (!isPasswordStrong(password)) {
      setPasswordTouched(true);
      setError("Your password doesn't meet the requirements below.");
      return;
    }
    if (password !== confirmPassword) {
      setConfirmTouched(true);
      setError("Password and Confirm Password don't match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email, password, name);
      // If email confirmations are on, there's no session yet — ask them to
      // verify first. If they're off, onAuthStateChange logs the user in and
      // we can go straight to the app.
      setCheckEmail(true);
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      if (err instanceof AuthActionError && err.code === "email_registered") {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Could not create your account.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-4 sm:py-8">
      <div className="shadow-bento rounded-2xl bg-card border border-border p-5 sm:p-8">
        <div className="mb-6">
          <BrandLogo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Students only need an account to show interest in clubs and chapters, submit updates and
          use Buy & Sell.
        </p>

        {checkEmail ? (
          <p className="pt-6 text-sm font-semibold">
            Account created. If email confirmation is enabled for this project, check your inbox to
            verify before logging in.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogleSignup}
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
                <label htmlFor="name" className="text-sm font-bold">
                  Full name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="text-sm font-bold">
                  College email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@campus.edu"
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="text-sm font-bold">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    aria-describedby="password-requirements"
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
                <ul
                  id="password-requirements"
                  className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2"
                >
                  {passwordRequirementResults(password).map((r) => (
                    <li
                      key={r.id}
                      className={
                        "flex items-center gap-1.5 text-xs font-semibold " +
                        (r.met
                          ? "text-foreground"
                          : passwordTouched
                            ? "text-destructive"
                            : "text-muted-foreground")
                      }
                    >
                      {r.met ? (
                        <Check className="size-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <X className="size-3.5 shrink-0" aria-hidden="true" />
                      )}
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="text-sm font-bold">
                  Confirm password
                </label>
                <div className="relative mt-1">
                  <input
                    id="signup-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    aria-invalid={confirmTouched && password !== confirmPassword}
                    className="min-h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {confirmTouched && password !== confirmPassword ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <X className="size-3.5 shrink-0" aria-hidden="true" />
                    Passwords don't match.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p role="alert" className="text-sm font-semibold text-destructive">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          </>
        )}

        <p className="pt-4 text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="font-bold text-primary">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
