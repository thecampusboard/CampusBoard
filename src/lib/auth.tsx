import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

/**
 * Session layer for CampusBoard, backed by Supabase Auth + the `profiles`
 * table (see supabase/migrations/001_initial_schema.sql).
 *
 * The role shown here is read-only client state used for UI gating — the
 * actual enforcement is server-side: Postgres RLS policies (keyed off
 * `public.is_admin()`) and the `profiles_guard_role` / `handle_new_user`
 * triggers are the source of truth for who can do what.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
}

/**
 * Thrown by signUp/login for the specific cases the UI needs to message
 * differently (see login.tsx / signup.tsx). Anything Supabase doesn't let
 * us distinguish — e.g. wrong password vs. no such account, by design, to
 * avoid leaking which emails are registered — still surfaces as a plain
 * Error with Supabase's own message.
 */
export class AuthActionError extends Error {
  code: "email_registered" | "email_not_confirmed" | "rate_limited";
  constructor(code: AuthActionError["code"], message: string) {
    super(message);
    this.name = "AuthActionError";
    this.code = code;
  }
}

interface AuthValue {
  user: SessionUser | null;
  ready: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<SessionUser>;
  loginWithGoogle: (redirectPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-sends the signup confirmation email — surfaced next to the "Email not verified" message on the Login page. */
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

async function loadProfile(session: Session | null): Promise<SessionUser | null> {
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role")
    .eq("id", session.user.id)
    .single();
  if (error || !data) return null;
  return data as SessionUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const profile = await loadProfile(data.session);
      if (active) {
        setUser(profile);
        setReady(true);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = await loadProfile(session);
      if (active) setUser(profile);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      if (/already registered|already exists|user_already_exists/i.test(error.message)) {
        throw new AuthActionError(
          "email_registered",
          "This email is already registered. Try logging in instead.",
        );
      }
      if (/rate limit|too many/i.test(error.message)) {
        throw new AuthActionError(
          "rate_limited",
          "Too many attempts. Please wait a moment and try again.",
        );
      }
      throw error;
    }
    // When "Confirm email" is enabled, Supabase intentionally returns a
    // *success* response with an empty identities array (instead of an
    // error) when the address already belongs to a confirmed account —
    // this is by design, to stop signup from being used to enumerate
    // registered emails. We still need to tell the user something useful,
    // so we detect that shape here.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new AuthActionError(
        "email_registered",
        "This email is already registered. Try logging in instead.",
      );
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        throw new AuthActionError(
          "email_not_confirmed",
          "Your email hasn't been verified yet. Check your inbox for the verification link.",
        );
      }
      if (/rate limit|too many/i.test(error.message)) {
        throw new AuthActionError(
          "rate_limited",
          "Too many attempts. Please wait a moment and try again.",
        );
      }
      throw error;
    }
    const profile = await loadProfile(data.session);
    if (!profile) throw new Error("Signed in, but no profile was found for this account.");
    setUser(profile);
    return profile;
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw error;
  }, []);

  // Google sign-in via Supabase Auth. This redirects the browser away to
  // Google and back, so there's no return value here — the session is
  // picked up by onAuthStateChange above once the browser lands back on
  // /auth/callback. `redirectPath` is where the callback route should send
  // the user afterwards (defaults to home); it's carried through as a query
  // param since the OAuth round trip doesn't otherwise preserve app state.
  const loginWithGoogle = useCallback(async (redirectPath?: string) => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectPath) callbackUrl.searchParams.set("redirect", redirectPath);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signUp, login, loginWithGoogle, logout, resendVerification }),
    [user, ready, signUp, login, loginWithGoogle, logout, resendVerification],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Build a Google Calendar event URL from campus event details. */
export function googleCalendarUrl(input: {
  title: string;
  date: string;
  endDate?: string;
  /** 24-hour "HH:MM", campus-local. When present, the calendar entry gets a real start/end time instead of being all-day. */
  startTime?: string;
  /** 24-hour "HH:MM", campus-local. Defaults to one hour after startTime when omitted. */
  endTime?: string;
  /** Legacy free-text time range, used only when startTime isn't available. */
  time?: string;
  details: string;
  location: string;
}) {
  let dates: string;
  let details = input.details;

  if (input.startTime) {
    // Real start (and end, when known) timestamp — Google Calendar reads
    // "YYYYMMDDTHHMMSS" with no trailing Z as floating local time, which
    // matches how every date/time on this event is already stored (campus
    // wall-clock time, no timezone column on the table).
    const startStamp = `${input.date.replace(/-/g, "")}T${input.startTime.replace(":", "")}00`;
    const endDateSource = input.endDate ?? input.date;
    let endStamp: string;
    if (input.endTime) {
      endStamp = `${endDateSource.replace(/-/g, "")}T${input.endTime.replace(":", "")}00`;
    } else {
      // No end time given — default to a 1-hour block on the same/end date.
      const end = new Date(`${endDateSource}T${input.startTime}:00`);
      end.setHours(end.getHours() + 1);
      endStamp = `${end.toISOString().slice(0, 10).replace(/-/g, "")}T${end
        .toTimeString()
        .slice(0, 8)
        .replace(/:/g, "")}`;
    }
    dates = `${startStamp}/${endStamp}`;
  } else {
    // No structured time on this event (only true for rows created before
    // start_time existed) — fall back to an all-day entry and put whatever
    // free-text time is on record in the details instead of guessing.
    const start = input.date.replace(/-/g, "");
    const endSource = input.endDate ?? input.date;
    const end = new Date(endSource + "T00:00:00");
    end.setDate(end.getDate() + 1);
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, "");
    dates = `${start}/${endStr}`;
    details = input.time ? `Time: ${input.time}\n\n${input.details}` : input.details;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates,
    details,
    location: input.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
