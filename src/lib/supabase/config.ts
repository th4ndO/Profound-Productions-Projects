/**
 * Supabase project URL and anon/publishable key.
 *
 * Hardcoded literals, deliberately NOT read from `process.env.NEXT_PUBLIC_*`
 * here. This is ONLY safe because both of these specific values are the
 * Supabase anon/publishable key and project URL — meant to be public,
 * exposed to the browser by design, not secrets.
 *
 * Two separate env-var gaps forced this: (1) this environment has no API
 * access to set Vercel's dashboard Environment Variables, and (2) Vercel's
 * Edge Middleware bundler does its own static analysis of
 * `process.env.NEXT_PUBLIC_*` references and only injects values from its
 * own dashboard-configured env system — it ignores a committed
 * `.env.production` file entirely for that specific artifact, even though
 * `next build` correctly uses that file for every other bundle (confirmed:
 * a `process.env.NEXT_PUBLIC_SUPABASE_URL ?? "<literal>"` fallback still
 * failed at the deployed middleware with "URL and Key are required", which
 * only a plain hardcoded literal — no process.env reference at all — fixed).
 *
 * NEVER apply this pattern to a real secret (service role key, VAPID
 * private key, CRON_SECRET, etc.). Those must only ever come from
 * process.env, backed by a real dashboard-configured env var, and should
 * throw loudly if missing rather than silently falling back to anything.
 */
export const SUPABASE_URL = "https://bvapxwiryuzzbxesbtqo.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YXB4d2lyeXV6emJ4ZXNidHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODIwNDAsImV4cCI6MjEwNDk1ODA0MH0.JY33jU_EE_mUX2QO8zAGdTK2021ERkminaMvpQcj2-o";
