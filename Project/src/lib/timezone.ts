/**
 * True if `timezone` is an IANA zone this runtime's Intl accepts. The
 * send-reminders Edge Function formats times with Intl in the stored zone,
 * so a value that fails here would fail there too.
 */
export function isValidTimeZone(timezone: string): boolean {
  if (!timezone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
