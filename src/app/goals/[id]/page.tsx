import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Theme } from "@/components/visuals/GoalVisual";
import type { Timeframe } from "@/lib/timeframe";
import type { GoalDetail } from "@/lib/goal-types";
import { GoalDetailClient } from "./GoalDetailClient";

interface TaskRow {
  id: string;
  title: string;
  done: boolean;
  position: number;
}
interface MilestoneRow {
  id: string;
  title: string;
  done: boolean;
  position: number;
  tasks: TaskRow[];
}
interface GoalRow {
  id: string;
  title: string;
  theme: Theme;
  timeframe: Timeframe | null;
  reward: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  milestones: MilestoneRow[];
}

function toGoalDetail(row: GoalRow): GoalDetail {
  return {
    id: row.id,
    title: row.title,
    theme: row.theme,
    timeframe: row.timeframe,
    reward: row.reward,
    due_at: row.due_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    milestones: [...row.milestones]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        title: m.title,
        done: m.done,
        tasks: [...m.tasks]
          .sort((a, b) => a.position - b.position)
          .map((t) => ({ id: t.id, title: t.title, done: t.done })),
      })),
  };
}

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("goals")
    .select(
      "id, title, theme, timeframe, reward, due_at, completed_at, created_at, milestones(id, title, done, position, tasks(id, title, done, position))",
    )
    .eq("id", id)
    .single();

  // RLS makes another user's goal look identical to a missing one here —
  // that's deliberate, it never leaks whether the id exists at all.
  if (error || !data) notFound();

  return <GoalDetailClient goal={toGoalDetail(data as GoalRow)} />;
}
