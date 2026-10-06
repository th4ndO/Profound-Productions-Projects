import type { SupabaseClient } from "@supabase/supabase-js";
import { gProg, mProg } from "./progress";

export interface StepTask {
  id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface StepMilestone {
  id: string;
  title: string;
  done: boolean;
  position: number;
  tasks: StepTask[];
}

export interface NextStep {
  kind: "task" | "milestone";
  id: string;
  title: string;
}

/**
 * The goal's next unfinished step: the first unfinished task (by position)
 * in the first milestone that isn't complete, or that milestone itself if
 * it has no tasks. Null when everything is done.
 */
export function nextStep(milestones: StepMilestone[]): NextStep | null {
  const ordered = [...milestones].sort((a, b) => a.position - b.position);
  for (const m of ordered) {
    if (mProg(m) === 1) continue;
    const task = [...m.tasks].sort((a, b) => a.position - b.position).find((t) => !t.done);
    return task ? { kind: "task", id: task.id, title: task.title } : { kind: "milestone", id: m.id, title: m.title };
  }
  return null;
}

/**
 * The value goals.completed_at should have: set (keeping an earlier
 * timestamp) once every milestone is done, cleared when progress drops.
 * A goal with no milestones is never complete.
 */
export function completedAtFor(
  milestones: { done: boolean; tasks: { done: boolean }[] }[],
  current: string | null,
  now: Date = new Date(),
): string | null {
  const complete = milestones.length > 0 && gProg({ milestones }) >= 1;
  if (!complete) return null;
  return current ?? now.toISOString();
}

/**
 * Brings goals.completed_at in line with the goal's milestones and tasks.
 * Call after anything that changes them. Uses the caller's session, so RLS
 * still limits it to their own goal.
 */
export async function syncGoalCompletion(supabase: SupabaseClient, goalId: string): Promise<void> {
  const { data, error } = await supabase
    .from("goals")
    .select("completed_at, milestones(done, tasks(done))")
    .eq("id", goalId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return;
  const row = data as { completed_at: string | null; milestones: { done: boolean; tasks: { done: boolean }[] }[] };
  const next = completedAtFor(row.milestones, row.completed_at);
  if (next === row.completed_at) return;
  const { error: updateError } = await supabase.from("goals").update({ completed_at: next }).eq("id", goalId);
  if (updateError) throw new Error(updateError.message);
}
