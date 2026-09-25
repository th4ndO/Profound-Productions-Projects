import type { Theme } from "@/components/visuals/GoalVisual";
import type { Timeframe } from "@/lib/timeframe";

/** Client-facing shapes for a full goal + its milestones + their tasks. */

export interface TaskDetail {
  id: string;
  title: string;
  done: boolean;
}

export interface MilestoneDetail {
  id: string;
  title: string;
  done: boolean;
  tasks: TaskDetail[];
}

export interface GoalDetail {
  id: string;
  title: string;
  theme: Theme;
  timeframe: Timeframe | null;
  reward: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  milestones: MilestoneDetail[];
}
