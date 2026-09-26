"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/timezone";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  return { supabase, user };
}

/**
 * Upserts the signed-in user's `profiles` row — no row exists until the
 * first save here (nothing creates one on signup), so this must work
 * whether or not one is already there.
 */
export async function updateProfile(
  timezone: string,
  quietStart: string,
  quietEnd: string,
): Promise<void> {
  const { supabase, user } = await requireUser();

  if (!isValidTimeZone(timezone)) throw new Error("Pick a valid timezone.");
  if (!/^\d{2}:\d{2}$/.test(quietStart) || !/^\d{2}:\d{2}$/.test(quietEnd)) {
    throw new Error("Quiet hours need a valid time.");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      timezone,
      quiet_start: quietStart,
      quiet_end: quietEnd,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * "Sign out and erase" for an anonymous account. There is no login to come
 * back with, so signing out would leave this user's rows unreachable by
 * anyone (and reminders would keep firing at this device). Instead: delete
 * everything the user owns, then sign out. Goals cascade to milestones,
 * tasks and reminder_rules; push subscriptions and the profile are deleted
 * explicitly. Every delete must succeed before signing out, so a failure
 * never leaves the user signed out with their data still stored.
 *
 * The (now empty) anonymous auth user itself remains; deleting auth users
 * needs the service role and is a separate cleanup job.
 */
export async function signOutAndErase(): Promise<void> {
  const { supabase, user } = await requireUser();

  for (const table of ["goals", "reminder_rules", "push_subscriptions", "profiles"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) throw new Error(`Couldn't erase your data (${table}): ${error.message}`);
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
