import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoalTabs } from "@/components/GoalTabs";
import {
  addDays,
  formatDuration,
  isValidDay,
  nowIn,
  parseTime,
  planDay,
  type PlannerTask,
  type TaskKind,
} from "@/lib/planner";
import { AddTaskForm } from "./AddTaskForm";
import { GoalPicker } from "./GoalPicker";
import { DayHours } from "./DayHours";
import { Timeline } from "./Timeline";
import { CarryOver } from "./CarryOver";
import styles from "./plan.module.css";

export const metadata = {
  title: "Plan my day — Groundwork",
};

const DEFAULT_TIMEZONE = "Africa/Johannesburg";

interface DayTaskRow {
  id: string;
  title: string;
  minutes: number;
  fixed_start: string | null;
  kind: TaskKind;
  goal_id: string | null;
  done: boolean;
  position: number;
}

function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  if (day === addDays(today, -1)) return "Yesterday";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * "Plan my day": the user lists a day's tasks (with a time estimate, and
 * optionally a fixed time); the page lays them out with lib/planner.ts,
 * adds their goals as time blocks, and says plainly what won't fit.
 */
export default async function PlanPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/start");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, day_start, day_end")
    .eq("user_id", user.id)
    .maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const dayStartText = (profile?.day_start ?? "07:00").slice(0, 5);
  const dayEndText = (profile?.day_end ?? "22:00").slice(0, 5);

  const now = nowIn(timezone);
  const { day: dayParam } = await searchParams;
  const day = dayParam && isValidDay(dayParam) ? dayParam : now.day;
  const isToday = day === now.day;
  const isPast = day < now.day;

  const [{ data: taskRows }, { data: goalRows }, { count: unfinishedEarlier }] = await Promise.all([
    supabase
      .from("day_tasks")
      .select("id, title, minutes, fixed_start, kind, goal_id, done, position")
      .eq("day", day)
      .order("position"),
    supabase.from("goals").select("id, title").is("completed_at", null).order("created_at"),
    supabase
      .from("day_tasks")
      .select("id", { count: "exact", head: true })
      .eq("done", false)
      .lt("day", now.day),
  ]);

  const rows = (taskRows ?? []) as DayTaskRow[];
  const tasks: PlannerTask[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    minutes: r.minutes,
    fixedStart: r.fixed_start ? parseTime(r.fixed_start) : null,
    kind: r.kind,
    done: r.done,
    position: r.position,
  }));

  const dayStart = parseTime(dayStartText);
  const dayEnd = parseTime(dayEndText);
  const from = isPast ? dayEnd : isToday ? now.minutes : dayStart;
  const plan = planDay({ dayStart, dayEnd, from, tasks });

  const plannedGoalIds = new Set(rows.filter((r) => r.goal_id).map((r) => r.goal_id));
  const unplannedGoals = ((goalRows ?? []) as { id: string; title: string }[]).filter(
    (g) => !plannedGoalIds.has(g.id),
  );
  const doneTasks = tasks.filter((t) => t.done);
  const spare = plan.availableMinutes - plan.usedMinutes;
  const overflowMinutes = plan.overflow.reduce((sum, t) => sum + t.minutes, 0);

  return (
    <div className={styles.wrap}>
      <header className={styles.top}>
        <h1 className={styles.brand}>Groundwork</h1>
        <div className={styles.actions}>
          <ThemeToggle className={styles.actions} buttonClassName={styles.ghost} />
          <Link href="/settings" className={styles.ghost}>
            Settings
          </Link>
        </div>
      </header>

      <GoalTabs active="plan" />

      <div className={styles.dayNav}>
        <Link href={`/plan?day=${addDays(day, -1)}`} className={styles.ghost} aria-label="Previous day">
          ‹
        </Link>
        <h2 className={styles.dayTitle}>{dayLabel(day, now.day)}</h2>
        <Link href={`/plan?day=${addDays(day, 1)}`} className={styles.ghost} aria-label="Next day">
          ›
        </Link>
        {!isToday && (
          <Link href="/plan" className={styles.todayLink}>
            Back to today
          </Link>
        )}
      </div>

      <DayHours dayStart={dayStartText} dayEnd={dayEndText} />

      {isToday && (unfinishedEarlier ?? 0) > 0 && <CarryOver today={day} count={unfinishedEarlier ?? 0} />}

      {!isPast && unplannedGoals.length > 0 && <GoalPicker day={day} goals={unplannedGoals} />}

      {!isPast && <AddTaskForm day={day} />}

      {tasks.length > 0 && (
        <p className={plan.overflow.length ? `${styles.summary} ${styles.summaryBad}` : styles.summary}>
          {isPast
            ? `This day has passed. ${doneTasks.length} of ${tasks.length} done.`
            : plan.overflow.length
              ? `Too much for one day: ${plan.overflow.length} task${plan.overflow.length === 1 ? "" : "s"} (${formatDuration(overflowMinutes)}) won't fit. Move ${plan.overflow.length === 1 ? "it" : "some"} to tomorrow or cut something.`
              : `Planned ${formatDuration(plan.usedMinutes)} of ${formatDuration(plan.availableMinutes)} free${isToday ? " left today" : ""}. ${formatDuration(spare)} to spare.`}
        </p>
      )}

      <Timeline
        day={day}
        tomorrow={addDays(day, 1)}
        today={now.day}
        blocks={plan.blocks}
        overflow={plan.overflow}
        done={doneTasks}
        isPast={isPast}
      />

      {tasks.length === 0 && !isPast && (
        <p className={styles.emptyNote}>
          Add what you need to get done{unplannedGoals.length ? " and your goal time" : ""}, and
          Groundwork lays out your day: fixed times first, must-dos early, breaks after long
          stretches, and a little extra time on each task because things take longer than we think.
        </p>
      )}
    </div>
  );
}
