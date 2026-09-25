"use server";

import { createClient } from "@/lib/supabase/server";

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

  if (!timezone.trim()) throw new Error("A timezone is required.");
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
