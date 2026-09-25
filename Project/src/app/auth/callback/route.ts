import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the `code` query param from a Supabase account-confirmation
 * email (sent on sign-up when "Confirm email" is on) for a session, then
 * redirects into the app. Per Supabase's Next.js App Router
 * auth helper pattern (using @supabase/ssr's exchangeCodeForSession).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
