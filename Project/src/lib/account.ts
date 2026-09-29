/**
 * Shared rules for saving and signing in to an email + password account.
 *
 * Email confirmation is switched off in Supabase Auth (the project has no
 * email sender that reaches people other than the owner), so an email is
 * never verified: it's just the name of the account.
 */

export const PASSWORD_MIN_LENGTH = 8; // matches Supabase Auth password_min_length

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Returns a message for the first problem found, or null if it's usable. */
export function credentialsProblem(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use a password of at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > 72) return "Use a password of 72 characters or fewer.";
  return null;
}

/** Plain-language message for a Supabase Auth error code. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "email_exists":
    case "user_already_exists":
      return "That email already has an account. Sign in to it instead.";
    case "weak_password":
      return "That password is too common or has appeared in a data leak. Choose a different one.";
    case "same_password":
      return "That's already your password. Choose a different one.";
    case "invalid_credentials":
      return "Wrong email or password.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "over_request_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
