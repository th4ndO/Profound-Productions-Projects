import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (browser context).
 * Reads the session from cookies set by the server client/middleware.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
