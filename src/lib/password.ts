/**
 * CampusBoard password policy.
 *
 * This is the frontend half only — it exists to give people a fast,
 * friendly error before they ever hit the network. It is NOT the security
 * boundary: Supabase Auth issues the account either way, so the project's
 * Auth settings (Dashboard → Authentication → Policies → Password
 * requirements) must be configured to require at least the same minimum
 * length for this to be enforced consistently for every signup path,
 * including Google OAuth-linked accounts and any future non-browser
 * client. See README.md.
 */

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "One special character",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export function passwordRequirementResults(password: string) {
  return PASSWORD_REQUIREMENTS.map((r) => ({ ...r, met: r.test(password) }));
}

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(password));
}

export function passwordStrengthError(password: string): string | null {
  const unmet = PASSWORD_REQUIREMENTS.filter((r) => !r.test(password));
  if (unmet.length === 0) return null;
  return `Password needs: ${unmet.map((r) => r.label.toLowerCase()).join(", ")}.`;
}
