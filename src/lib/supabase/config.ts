/**
 * Supabase project URL and anon/publishable key.
 *
 * Prefers real env vars (set via Vercel's dashboard, or .env.local locally)
 * but falls back to literal values when they're absent. This is ONLY safe
 * because both of these specific values are the Supabase anon/publishable
 * key and project URL — meant to be public, exposed to the browser by
 * design, not secrets.
 *
 * The fallback exists because this environment currently has no API access
 * to set Vercel's dashboard Environment Variables, and Vercel's actual
 * serverless/edge runtime does NOT read a committed .env.production file at
 * request time (unlike `next build`, which does use it for client-bundle
 * inlining — that gap is exactly what broke the deployed middleware).
 *
 * NEVER apply this fallback pattern to a real secret (service role key,
 * VAPID private key, CRON_SECRET, etc.). Those must only ever come from
 * process.env, backed by a real dashboard-configured env var, and should
 * throw loudly if missing rather than silently falling back to anything.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://bvapxwiryuzzbxesbtqo.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YXB4d2lyeXV6emJ4ZXNidHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODIwNDAsImV4cCI6MjEwNDk1ODA0MH0.JY33jU_EE_mUX2QO8zAGdTK2021ERkminaMvpQcj2-o";
