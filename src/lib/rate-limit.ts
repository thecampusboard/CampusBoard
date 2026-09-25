/**
 * Client-side rate limiter for email/password login, per the brief: block
 * further attempts after 5 FAILED attempts within a window, and never
 * touch Google OAuth. This is a UX-level guard (a cleared localStorage
 * bypasses it) — the actual security boundary is Supabase Auth's own
 * server-side rate limiting, which the Supabase Dashboard lets an Admin
 * tighten further (Authentication → Rate Limits). Both are worth having:
 * this one gives the person a clear, specific message instead of a wall of
 * failed requests hitting the real limit.
 */

const STORAGE_KEY = "campusboard.loginAttempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

function readAll(): Record<string, AttemptRecord> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AttemptRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, AttemptRecord>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* localStorage unavailable (private mode, etc.) — rate limiting is best-effort. */
  }
}

/** Returns remaining lockout time in ms if this email is currently blocked, else 0. */
export function loginLockoutRemaining(email: string): number {
  const key = email.trim().toLowerCase();
  const record = readAll()[key];
  if (!record) return 0;
  const elapsed = Date.now() - record.firstAttemptAt;
  if (elapsed > WINDOW_MS) return 0;
  if (record.count < MAX_ATTEMPTS) return 0;
  return WINDOW_MS - elapsed;
}

/** Call after a failed email/password login attempt. */
export function recordFailedLogin(email: string) {
  const key = email.trim().toLowerCase();
  const records = readAll();
  const existing = records[key];
  if (!existing || Date.now() - existing.firstAttemptAt > WINDOW_MS) {
    records[key] = { count: 1, firstAttemptAt: Date.now() };
  } else {
    records[key] = { count: existing.count + 1, firstAttemptAt: existing.firstAttemptAt };
  }
  writeAll(records);
}

/** Call after a successful login to clear any prior failed-attempt history for this email. */
export function clearLoginAttempts(email: string) {
  const key = email.trim().toLowerCase();
  const records = readAll();
  if (key in records) {
    delete records[key];
    writeAll(records);
  }
}

export function formatLockoutRemaining(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return minutes <= 1 ? "1 minute" : `${minutes} minutes`;
}
