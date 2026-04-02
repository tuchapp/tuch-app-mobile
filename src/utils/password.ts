/**
 * Shared password validation rules.
 * Must be kept in sync with any server-side / Supabase project password policy.
 */

export const PASSWORD_RULES = {
  minLength: 12,
  hint: "12+ characters with uppercase, lowercase, a number, and a symbol.",
  placeholder: "12+ chars, upper, lower, number, symbol",
} as const;

export type PasswordError = string;

/**
 * Returns an error message if the password fails policy, or null if it passes.
 */
export function validatePassword(password: string): PasswordError | null {
  if (password.length < PASSWORD_RULES.minLength) {
    return `Password must be at least ${PASSWORD_RULES.minLength} characters.`;
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one symbol (e.g. !, @, #, $).";
  }
  return null;
}
