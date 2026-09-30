import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MIDDLEWARE_SUPABASE_URL, MIDDLEWARE_SUPABASE_ANON_KEY } from "./config";

// Routes that don't require a session. Everything else redirects a
// visitor with no session to /start, which creates an anonymous account
// for this browser and sends them back. /sign-in is public so a saved
// account can sign in on a new device without creating one first.
//
// "/dev" is a dev-only verification area (e.g. /dev/visuals, Phase 2
// BUILD SPEC §8) — not real app content, so it stays public rather than
// requiring a signed-in session to view.
const PUBLIC_PATH_PREFIXES = ["/start", "/sign-in", "/dev"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated visitors away from protected routes. Called from
 * src/proxy.ts (Next 16 renamed the middleware convention to "proxy").
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    MIDDLEWARE_SUPABASE_URL,
    MIDDLEWARE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: avoid writing logic between createServerClient and this
  // call — it's what refreshes the token if needed.
  //
  // getClaims() verifies the session's JWT locally against the project's
  // public signing key (ES256; the JWKS is fetched once and cached), so
  // this check, which runs on every request, no longer makes a round trip
  // to Supabase Auth. Pages and actions still call getUser() for anything
  // that needs the server-side user record.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/start";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: return supabaseResponse as-is (not a new NextResponse) so
  // the refreshed cookies actually reach the browser.
  return supabaseResponse;
}
