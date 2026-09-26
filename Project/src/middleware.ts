import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - common static asset extensions
     * - sw.js (the service worker script — browsers hard-fail service
     *   worker registration if the script is served via a redirect, so it
     *   must never hit the auth-redirect logic below, signed in or not)
     * - manifest.webmanifest (browsers fetch it without cookies, so it
     *   would always be redirected to /sign-in)
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
