"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mProg } from "@/lib/progress";
import { pushedDueDate } from "@/lib/due";
import { TIMEFRAME_DAYS, TIMEFRAMES, type Timeframe } from "@/lib/timeframe";
import { THEMES, type Theme } from "@/components/visuals/GoalVisual";
import { IDEAS } from "@/lib/ideas";

/**
 * Server Actions backing the goal detail / new-goal screens. Every
 * exported async function here is callable directly from Client
 * Components (imperatively, or as a <form action={...}>) and runs with
 * the signed-in user's cookie-scoped Supabase client, so Postgres RLS
 * (see supabase/migrations/*_row_level_security.sql) is the real
 * authorization boundary — these actions don't re-check ownership
 * themselves beyond requiring a signed-in user.
 *
 * Each action throws a plain Error on failure (rather than swallowing
 * it), so a caller doing an optimistic client-side update can catch it
 * and roll the UI back, per the BUILD SPEC's "optimistic updates with
 * rollback" requirement.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}

function isTimeframe(value: string): value is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(value);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  return { supabase, user };
}

/** Row shapes read back from Supabase (untyped client — see lib/supabase). */
interface TaskDoneRow {
  id: string;
  done: boolean;
}
interface MilestoneWithTasksRow {
  id: string;
  done: boolean;
  tasks: TaskDoneRow[];
}

// ---------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------

/** Used as a <form action={createGoal}> on /goals/new. Redirects on success. */
export async function createGoal(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();

  const title = String(formData.get("title") ?? "")
    .trim()
    .slice(0, 80);
  if (!title) throw new Error("Title is required.");

  const themeRaw = String(formData.get("theme") ?? "tree");
  const theme: Theme = isTheme(themeRaw) ? themeRaw : "tree";

  const timeframeRaw = String(formData.get("timeframe") ?? "month");
  const timeframe: Timeframe = isTimeframe(timeframeRaw) ? timeframeRaw : "month";

  const reward = String(formData.get("reward") ?? "").trim().slice(0, 120) || null;

  const milestoneTitles = String(formData.get("milestones") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

  const now = Date.now();
  const dueAt = new Date(now + TIMEFRAME_DAYS[timeframe] * DAY_MS);

  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      title,
      theme,
      timeframe,
      reward,
      due_at: dueAt.toISOString(),
    })
    .select("id")
    .single();

  if (goalError || !goal) {
    throw new Error(goalError?.message ?? "Could not create that goal.");
  }
  const goalId = (goal as { id: string }).id;

  if (milestoneTitles.length) {
    const { error: msError } = await supabase.from("milestones").insert(
      milestoneTitles.map((milestoneTitle, i) => ({
        goal_id: goalId,
        title: milestoneTitle,
        position: i,
      })),
    );
    if (msError) throw new Error(msError.message);
  }

  revalidatePath("/");
  redirect(`/goals/${goalId}`);
}

/**
 * "Add to my goals" on /ideas — ported 1:1 from the prototype's `adopt`
 * case. The idea's fields come from the server's own IDEAS data, never
 * from client input, and `idea_id` is unique per user (see
 * supabase/migrations/*_initial_schema.sql), so this is a safe no-op
 * (redirects to the existing goal) rather than an error if it's called
 * twice — matching `state.goals.some(x=>x.ideaId===i.id)` in the prototype.
 */
export async function adoptIdea(ideaId: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const idea = IDEAS.find((i) => i.id === ideaId);
  if (!idea) throw new Error("That idea could not be found.");

  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", user.id)
    .eq("idea_id", idea.id)
    .maybeSingle();
  if (existing) {
    redirect(`/goals/${(existing as { id: string }).id}`);
  }

  const dueAt = new Date(Date.now() + TIMEFRAME_DAYS[idea.tf] * DAY_MS);

  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      idea_id: idea.id,
      title: idea.title,
      theme: idea.theme,
      timeframe: idea.tf,
      reward: idea.reward,
      due_at: dueAt.toISOString(),
    })
    .select("id")
    .single();
  if (goalError || !goal) {
    throw new Error(goalError?.message ?? "Could not add that goal.");
  }
  const goalId = (goal as { id: string }).id;

  const { error: msError } = await supabase.from("milestones").insert(
    idea.ms.map((title, i) => ({ goal_id: goalId, title, position: i })),
  );
  if (msError) throw new Error(msError.message);

  revalidatePath("/");
  revalidatePath("/ideas");
  redirect(`/goals/${goalId}`);
}

// ---------------------------------------------------------------------
// Toggle (milestone/task cascade — ported 1:1 from the prototype)
// ---------------------------------------------------------------------

/**
 * `case "toggleM": ... const complete = mProg(m) === 1; m.done = !complete; m.tasks.forEach(t=>t.done = !complete);`
 */
export async function toggleMilestone(goalId: string, milestoneId: string): Promise<void> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("milestones")
    .select("id, done, tasks(id, done)")
    .eq("id", milestoneId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Milestone not found.");
  const milestone = data as MilestoneWithTasksRow;

  const complete = mProg(milestone) === 1;
  const newDone = !complete;

  const { error: mErr } = await supabase
    .from("milestones")
    .update({ done: newDone })
    .eq("id", milestoneId);
  if (mErr) throw new Error(mErr.message);

  if (milestone.tasks.length) {
    const { error: tErr } = await supabase
      .from("tasks")
      .update({ done: newDone, done_at: newDone ? new Date().toISOString() : null })
      .eq("milestone_id", milestoneId);
    if (tErr) throw new Error(tErr.message);
  }

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

/**
 * `case "toggleT": ... t.done = !t.done; if(!t.done) m.done = false;`
 */
export async function toggleTask(goalId: string, milestoneId: string, taskId: string): Promise<void> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.from("tasks").select("id, done").eq("id", taskId).single();
  if (error || !data) throw new Error(error?.message ?? "Task not found.");
  const newDone = !(data as TaskDoneRow).done;

  const { error: tErr } = await supabase
    .from("tasks")
    .update({ done: newDone, done_at: newDone ? new Date().toISOString() : null })
    .eq("id", taskId);
  if (tErr) throw new Error(tErr.message);

  if (!newDone) {
    const { error: mErr } = await supabase.from("milestones").update({ done: false }).eq("id", milestoneId);
    if (mErr) throw new Error(mErr.message);
  }

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Add
// ---------------------------------------------------------------------

export async function addMilestone(
  goalId: string,
  title: string,
): Promise<{ id: string; title: string; done: boolean }> {
  const { supabase } = await requireUser();
  const trimmed = title.trim().slice(0, 100);
  if (!trimmed) throw new Error("Milestone title is required.");

  const { count } = await supabase
    .from("milestones")
    .select("id", { count: "exact", head: true })
    .eq("goal_id", goalId);

  const { data, error } = await supabase
    .from("milestones")
    .insert({ goal_id: goalId, title: trimmed, position: count ?? 0, done: false })
    .select("id, title, done")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not add that milestone.");

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
  return data as { id: string; title: string; done: boolean };
}

/** Also clears the milestone's `done` override, per the prototype's `addT`. */
export async function addTask(
  goalId: string,
  milestoneId: string,
  title: string,
): Promise<{ id: string; title: string; done: boolean }> {
  const { supabase } = await requireUser();
  const trimmed = title.trim().slice(0, 100);
  if (!trimmed) throw new Error("Task title is required.");

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("milestone_id", milestoneId);

  const { data, error } = await supabase
    .from("tasks")
    .insert({ milestone_id: milestoneId, title: trimmed, position: count ?? 0, done: false })
    .select("id, title, done")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not add that task.");

  const { error: mErr } = await supabase.from("milestones").update({ done: false }).eq("id", milestoneId);
  if (mErr) throw new Error(mErr.message);

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
  return data as { id: string; title: string; done: boolean };
}

// ---------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------

export async function deleteMilestone(goalId: string, milestoneId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("milestones").delete().eq("id", milestoneId);
  if (error) throw new Error(error.message);
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

export async function deleteTask(goalId: string, taskId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

/** Does not redirect — the caller navigates to "/" itself after this resolves. */
export async function deleteGoal(goalId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Theme / due date
// ---------------------------------------------------------------------

export async function setGoalTheme(goalId: string, theme: Theme): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").update({ theme }).eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
}

/**
 * "Give myself another week" — ported 1:1 from the prototype's `push` case.
 * Returns the new due date so the caller can reconcile its optimistic
 * (client-computed) value with the server's.
 */
export async function pushDueDate(goalId: string): Promise<string> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("goals").select("due_at").eq("id", goalId).single();
  if (error || !data) throw new Error(error?.message ?? "Goal not found.");

  const newDue = pushedDueDate((data as { due_at: string | null }).due_at);

  const { error: uErr } = await supabase
    .from("goals")
    .update({ due_at: newDue.toISOString() })
    .eq("id", goalId);
  if (uErr) throw new Error(uErr.message);

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/");
  return newDue.toISOString();
}
