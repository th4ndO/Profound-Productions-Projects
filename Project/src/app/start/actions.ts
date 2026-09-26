"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Gives this browser its own Supabase user without asking for any
 * credentials (Supabase anonymous sign-in). Everything else — RLS,
 * reminders, push subscriptions — keys off auth.uid() exactly as before.
 *
 * Runs on the server so the session cookies arrive as Set-Cookie headers:
 * Safari caps cookies written by page scripts at 7 days, which would
 * silently strand the user's data after a week away.
 */
export async function startAnonymousSession(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return; // already has a session (e.g. another tab got here first)

  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);
}
