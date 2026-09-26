import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MIDDLEWARE_SUPABASE_URL, MIDDLEWARE_SUPABASE_ANON_KEY } from "./config";

// Routes that don't require a session. Everything else redirects to
// /sign-in for an unauthenticated visitor. Phase 1 has no real app pages
// yet, so this protects the placeholder home page too.
//
// "/dev" is a dev-only verification area (e.g. /dev/visuals, Phase 2
// BUILD SPEC §8) — not real app content, so it stays public rather than
// requiring a signed-in session to view.
const PUBLIC_PATH_PREFIXES = ["/sign-in", "/auth/callback", "/dev"];

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
  // call — getUser() is what actually refreshes the token if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: return supabaseResponse as-is (not a new NextResponse) so
  // the refreshed cookies actually reach the browser.
  return supabaseResponse;
}
