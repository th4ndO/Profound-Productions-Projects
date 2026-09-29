"use server";

import { createClient } from "@/lib/supabase/server";
import { authErrorMessage, credentialsProblem, normaliseEmail } from "@/lib/account";

export type SignInResult = { error?: string; unsavedGoals?: boolean };

/**
 * Signs in to a saved email + password account on this device.
 *
 * Runs on the server so the session arrives as Set-Cookie headers (Safari
 * caps cookies written by page scripts at 7 days; see start/actions.ts).
 *
 * If this browser is on an anonymous account that has goals or planner
 * tasks, signing in would strand them (nobody could ever reach them again),
 * so it refuses and points the user to Settings to save or erase them
 * first. An anonymous account without either only has leftovers (a
 * profile, a push subscription); those are cleared so the empty anonymous
 * user is removed by the daily cleanup job.
 */
export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const cleanEmail = normaliseEmail(email);
  const problem = credentialsProblem(cleanEmail, password);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.is_anonymous) {
    let unsaved = 0;
    for (const table of ["goals", "day_tasks"] as const) {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) return { error: authErrorMessage(undefined) };
      unsaved += count ?? 0;
    }
    if (unsaved > 0) {
      return {
        unsavedGoals: true,
        error:
          "This device has goals or plans that aren't saved to an account yet. Save them as your account in Settings, or erase them there, then sign in.",
      };
    }
    for (const table of ["reminder_rules", "push_subscriptions", "profiles"] as const) {
      const { error: deleteError } = await supabase.from(table).delete().eq("user_id", user.id);
      if (deleteError) return { error: authErrorMessage(undefined) };
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) return { error: authErrorMessage(error.code) };
  return {};
}
