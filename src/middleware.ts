/**
 * Route-level auth gate. Runs on the Edge runtime, so it only imports
 * ./lib/session (pure Web Crypto, no Prisma/bcrypt) — not ./lib/auth.
 *
 * This middleware only decides "is there a validly signed, unexpired
 * session cookie" and redirects to /login when there isn't. Per-role
 * authorisation (e.g. PRODUCTION may not use the margin endpoint) is
 * enforced where the action actually happens — in the route handler or
 * server action via requireUser(roles) — because that is where a 403 with
 * a specific reason can be produced; middleware only ever redirects.
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const PUBLIC_PATHS = new Set(["/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;
  const payload = token && secret ? await verifySession(token, secret) : null;

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
