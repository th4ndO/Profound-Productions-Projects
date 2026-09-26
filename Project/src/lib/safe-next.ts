/**
 * Turns an untrusted `?next=` value into a same-site path, or "/".
 *
 * Prefix checks like `startsWith("/") && !startsWith("//")` are not
 * enough: browsers' URL parsers treat "\" as "/" and strip tabs and
 * newlines, so "/\evil.com" and "/\t/evil.com" both resolve to
 * https://evil.com/. Instead, resolve the value exactly as the browser
 * will and accept it only if it stays on our origin.
 */
const BASE = "https://same-origin.invalid";

export function safeNextPath(next: string | string[] | null | undefined): string {
  // A repeated param (?next=/a&next=/b) arrives as an array; don't guess
  // which one was meant.
  if (typeof next !== "string" || !next) return "/";
  // Control characters (tab, newline, etc.) and backslashes never belong in
  // a path we generate ourselves, so any value containing them is refused.
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return "/";
  if (!next.startsWith("/")) return "/";
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE) return "/";
  // Dot-segment normalisation can itself produce a protocol-relative path:
  // "/..//evil.com" resolves to pathname "//evil.com", which would leave the
  // site when used as a link. Refuse any result that isn't a single-slash path.
  if (url.pathname.startsWith("//")) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
