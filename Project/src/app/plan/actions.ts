"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidDay, parseTime } from "@/lib/planner";

export type PlanResult = { error?: string };

const KINDS = ["must", "nice"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  return { supabase, user };
}

function validMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 5 && minutes <= 720;
}

function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

async function nextPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  day: string,
): Promise<number> {
  const { data } = await supabase
    .from("day_tasks")
    .select("position")
    .eq("user_id", userId)
    .eq("day", day)
    .order("position", { ascending: false })
    .limit(1);
  return ((data?.[0]?.position as number | undefined) ?? -1) + 1;
}

export async function addTask(input: {
  day: string;
  title: string;
  minutes: number;
  kind: string;
  fixedStart: string | null;
}): Promise<PlanResult> {
  const { supabase, user } = await requireUser();
  if (typeof input.title !== "string" || typeof input.minutes !== "number") {
    return { error: "Give the task a name and a time." };
  }
  const title = input.title.trim();
  if (!isValidDay(input.day)) return { error: "That day isn't valid." };
  if (!title || title.length > 100) return { error: "Give the task a name (up to 100 characters)." };
  if (!validMinutes(input.minutes)) return { error: "Pick how long it takes (5 minutes to 12 hours)." };
  if (!(KINDS as readonly string[]).includes(input.kind)) return { error: "Pick must-do or nice-to-have." };
  if (input.fixedStart !== null && !validTime(input.fixedStart)) return { error: "Enter a valid time." };

  const { error } = await supabase.from("day_tasks").insert({
    user_id: user.id,
    day: input.day,
    title,
    minutes: input.minutes,
    kind: input.kind,
    fixed_start: input.fixedStart,
    position: await nextPosition(supabase, user.id, input.day),
  });
  if (error) return { error: "Couldn't add that task. Please try again." };
  return {};
}

/** Adds a time block for each chosen goal (goal ownership is enforced by RLS). */
export async function addGoalBlocks(
  day: string,
  blocks: { goalId: string; title: string; minutes: number }[],
): Promise<PlanResult> {
  const { supabase, user } = await requireUser();
  if (!isValidDay(day)) return { error: "That day isn't valid." };
  if (!Array.isArray(blocks) || blocks.length === 0) return {};
  if (blocks.length > 50) return { error: "That's too many goals for one day." };
  const valid = blocks.every(
    (b) =>
      typeof b.goalId === "string" &&
      UUID.test(b.goalId) &&
      typeof b.title === "string" &&
      validMinutes(b.minutes),
  );
  if (!valid) return { error: "Pick a valid time for each goal." };

  let position = await nextPosition(supabase, user.id, day);
  const rows = blocks.map((b) => ({
    user_id: user.id,
    day,
    title: b.title.trim().slice(0, 100) || "Goal time",
    minutes: b.minutes,
    kind: "goal",
    goal_id: b.goalId,
    position: position++,
  }));
  const { error } = await supabase.from("day_tasks").insert(rows);
  if (error) return { error: "Couldn't add your goals. Please try again." };
  return {};
}

export async function setTaskDone(id: string, done: boolean): Promise<PlanResult> {
  const { supabase, user } = await requireUser();
  if (typeof done !== "boolean") return { error: "Couldn't update that task." };
  const { error } = await supabase.from("day_tasks").update({ done }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Couldn't update that task." };
  return {};
}

export async function removeTask(id: string): Promise<PlanResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("day_tasks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Couldn't remove that task." };
  return {};
}

/** Moves one task to another day, at the end of that day's list. */
export async function moveTask(id: string, toDay: string): Promise<PlanResult> {
  const { supabase, user } = await requireUser();
  if (!isValidDay(toDay)) return { error: "That day isn't valid." };
  const { error } = await supabase
    .from("day_tasks")
    .update({ day: toDay, done: false, position: await nextPosition(supabase, user.id, toDay) })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't move that task." };
  return {};
}

/** Brings every unfinished task from days before `today` onto `today`. */
export async function carryOverUnfinished(today: string): Promise<PlanResult> {
  const { supabase, user } = await requireUser();
  if (!isValidDay(today)) return { error: "That day isn't valid." };
  const { data, error } = await supabase
    .from("day_tasks")
    .select("id")
    .eq("user_id", user.id)
    .eq("done", false)
    .lt("day", today)
    .order("day")
    .order("position");
  if (error) return { error: "Couldn't bring those tasks over." };
  let position = await nextPosition(supabase, user.id, today);
  for (const row of data ?? []) {
    const { error: moveError } = await supabase
      .from("day_tasks")
      .update({ day: today, position: position++ })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (moveError) return { error: "Couldn't bring those tasks over." };
  }
  return {};
}

export async function saveDayHours(dayStart: string, dayEnd: string): Promise<PlanResult> {
  const { supabase, user } = await requireUser();
  if (!validTime(dayStart) || !validTime(dayEnd)) return { error: "Enter valid times." };
  if (parseTime(dayEnd) <= parseTime(dayStart)) return { error: "Your day has to end after it starts." };
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, day_start: dayStart, day_end: dayEnd }, { onConflict: "user_id" });
  if (error) return { error: "Couldn't save your day hours." };
  return {};
}
