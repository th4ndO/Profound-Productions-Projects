/**
 * Supabase project URL and anon/publishable key.
 *
 * Two separate exports, deliberately NOT the same value source:
 *
 * - `SUPABASE_URL` / `SUPABASE_ANON_KEY` read `process.env.NEXT_PUBLIC_*`
 *   first, falling back to the literal when unset or empty. Use these
 *   everywhere except Edge Middleware (client.ts, server.ts). This lets a
 *   real env var — e.g. .env.local pointing at a local/staging Supabase
 *   project — actually take effect, which is the whole point of having one.
 *
 * - `MIDDLEWARE_SUPABASE_URL` / `MIDDLEWARE_SUPABASE_ANON_KEY` are PURE
 *   literals with no process.env reference at all. Use these ONLY from
 *   src/lib/supabase/middleware.ts. Confirmed by direct testing: Vercel's
 *   Edge Middleware bundler does its own static analysis of
 *   `process.env.NEXT_PUBLIC_*` references and only injects values from its
 *   own dashboard-configured env system for that one artifact — it ignores
 *   a committed `.env.production` file entirely there, even behind a `??`
 *   fallback, even though `next build` correctly uses that file for every
 *   other bundle. A plain literal with zero env reference is what actually
 *   worked when deployed.
 *
 * Both are safe to hardcode ONLY because these two specific values are the
 * Supabase anon/publishable key and project URL — meant to be public,
 * exposed to the browser by design, not secrets.
 *
 * NEVER apply this pattern to a real secret (service role key, VAPID
 * private key, CRON_SECRET, etc.). Those must only ever come from
 * process.env, backed by a real dashboard-configured env var, and should
 * throw loudly if missing rather than silently falling back to anything.
 */
const FALLBACK_SUPABASE_URL = "https://bvapxwiryuzzbxesbtqo.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YXB4d2lyeXV6emJ4ZXNidHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODIwNDAsImV4cCI6MjEwNDk1ODA0MH0.JY33jU_EE_mUX2QO8zAGdTK2021ERkminaMvpQcj2-o";

// `||`, not `??`: the Vercel project defines these env vars but as empty
// strings, and an empty string must fall back too — with `??` the server
// client got "" and every Server Action failed with "Your project's URL
// and Key are required".
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

// VAPID *public* key for Web Push (Phase 5) — like the anon key above, this
// one is meant to be public: the browser needs it to create a push
// subscription. The matching PRIVATE key lives only in Supabase Vault,
// read at send-time by the send-reminders Edge Function — never here.
const FALLBACK_VAPID_PUBLIC_KEY =
  "BDomUgswm-6No8mVSfZRApmuX2cEALOYVr49Wotb0T5JFYQ_aDs-JDPSm6FvRfHbFCmeYcacrw6e1mTYkB0f8I8";
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || FALLBACK_VAPID_PUBLIC_KEY;

// Edge Middleware only — see the module comment. Do not import these from
// client.ts or server.ts.
export const MIDDLEWARE_SUPABASE_URL = FALLBACK_SUPABASE_URL;
export const MIDDLEWARE_SUPABASE_ANON_KEY = FALLBACK_SUPABASE_ANON_KEY;
