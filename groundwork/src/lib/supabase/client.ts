import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
// NOTE: reads the env-aware pair from config.ts (not the middleware-only
// pure-literal one) — a real NEXT_PUBLIC_SUPABASE_URL/ANON_KEY should take
// effect here, e.g. for local dev against a different Supabase project.

/**
 * Supabase client for use in Client Components (browser context).
 * Reads the session from cookies set by the server client/middleware.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
