"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/timezone";
import type { ReminderRule } from "@/lib/reminder-types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  return { supabase, user };
}

function isValidDaysOfWeek(days: number[]): boolean {
  return (
    Array.isArray(days) &&
    days.length > 0 &&
    days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  );
}

/**
 * Creates this goal's reminder rule if none exists yet, otherwise updates
 * the existing one — a goal has at most one reminder rule (see
 * lib/reminder-types.ts), so this is an upsert keyed on (goal_id, user_id)
 * rather than a plain insert.
 */
export async function upsertReminderRule(
  goalId: string,
  daysOfWeek: number[],
  localTime: string,
  timezone: string,
): Promise<ReminderRule> {
  const { supabase, user } = await requireUser();

  if (!isValidDaysOfWeek(daysOfWeek)) {
    throw new Error("Pick at least one day.");
  }
  if (!/^\d{2}:\d{2}$/.test(localTime)) {
    throw new Error("Pick a valid time.");
  }
  if (!isValidTimeZone(timezone)) {
    throw new Error("Pick a valid timezone.");
  }

  const { data: existing } = await supabase
    .from("reminder_rules")
    .select("id")
    .eq("goal_id", goalId)
    .eq("user_id", user.id)
    .maybeSingle();

  const row = {
    goal_id: goalId,
    user_id: user.id,
    days_of_week: daysOfWeek,
    local_time: localTime,
    timezone,
    enabled: true,
  };

  const query = existing
    ? supabase.from("reminder_rules").update(row).eq("id", (existing as { id: string }).id)
    : supabase.from("reminder_rules").insert(row);

  const { data, error } = await query
    .select("id, days_of_week, local_time, timezone, enabled")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save that reminder.");

  revalidatePath(`/goals/${goalId}`);
  return data as ReminderRule;
}

export async function setReminderEnabled(
  goalId: string,
  ruleId: string,
  enabled: boolean,
): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reminder_rules").update({ enabled }).eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath(`/goals/${goalId}`);
}

export async function deleteReminderRule(goalId: string, ruleId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reminder_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath(`/goals/${goalId}`);
}
