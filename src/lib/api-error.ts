/**
 * Translates an AuthError thrown by requireUser() into the right HTTP
 * status for a route handler: 401 when nobody is signed in, 403 when they
 * are signed in but hold the wrong role. Used by every API route that
 * needs role-specific authorisation beyond what middleware alone can do
 * (middleware only knows "signed in or not", never "signed in as which
 * role") — see IT-06, a PRODUCTION-role request to the margin endpoint.
 */
import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    const status = err.code === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: err.message }, { status });
  }
  return null;
}
