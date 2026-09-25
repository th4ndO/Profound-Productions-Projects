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

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Registers (or re-registers) this browser's push subscription for the
 * signed-in user. `endpoint` is globally unique — upserting on it handles
 * the same device being re-subscribed, or handed to a different signed-in
 * user, without a duplicate row or a stale one pointing at the wrong user.
 */
export async function subscribeToPush(
  subscription: PushSubscriptionInput,
  userAgent: string,
): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
