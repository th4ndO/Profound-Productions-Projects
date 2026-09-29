/**
 * Daily planner: turns a day's task list into a timeline. Pure logic, no
 * I/O, so it's unit-tested (planner.test.ts) and the page just renders the
 * result. Times are minutes since local midnight.
 *
 * Rules, in order:
 * 1. Fixed-time tasks (appointments) sit exactly where they were pinned.
 *    Two that overlap are both kept, and the later one is reported as a
 *    conflict.
 * 2. Everything else fills the free gaps between `from` (the start of the
 *    day, or now if planning today) and the end of the day: must-dos first,
 *    then goal time, then nice-to-haves, each group in the order added.
 *    Front-loading must-dos puts them in the morning, when focus is usually
 *    best, and means anything that doesn't fit is the least important.
 * 3. Must-dos and nice-to-haves of 15 minutes or more get a 20% time cushion
 *    (rounded up to 5 minutes): people reliably underestimate how long
 *    tasks take (the "planning fallacy"). Goal blocks are time boxes the
 *    user chose, so they get none.
 * 4. After about 90 minutes of back-to-back work, a 10-minute break goes in
 *    before the next task (if there's room for both).
 * 5. Anything that still doesn't fit is returned as overflow, never
 *    silently squeezed in.
 */

export type TaskKind = "must" | "nice" | "goal";

export interface PlannerTask {
  id: string;
  title: string;
  minutes: number;
  /** Minutes since midnight, or null to let the planner place it. */
  fixedStart: number | null;
  kind: TaskKind;
  done: boolean;
  position: number;
}

export type Block =
  | { type: "task"; task: PlannerTask; start: number; end: number; cushion: number; conflict: boolean }
  | { type: "break"; start: number; end: number };

export interface Plan {
  blocks: Block[];
  /** Flexible tasks that didn't fit, in priority order. */
  overflow: PlannerTask[];
  /** Free minutes between `from` and the end of the day, outside fixed tasks. */
  availableMinutes: number;
  /** Minutes of that free time the flexible tasks and breaks use. */
  usedMinutes: number;
}

export const BREAK_AFTER = 90;
export const BREAK_MINUTES = 10;

const KIND_ORDER: Record<TaskKind, number> = { must: 0, goal: 1, nice: 2 };

export function roundUp5(n: number): number {
  return Math.ceil(n / 5) * 5;
}

/** The time cushion added to a flexible task (see rule 3). */
export function cushionFor(task: Pick<PlannerTask, "kind" | "minutes">): number {
  if (task.kind === "goal" || task.minutes < 15) return 0;
  return roundUp5(task.minutes * 0.2);
}

interface Gap {
  start: number;
  end: number;
  cursor: number;
  streak: number;
}

export function planDay(input: {
  dayStart: number;
  dayEnd: number;
  /** Earliest time to place flexible tasks (e.g. now, when planning today). */
  from?: number;
  tasks: PlannerTask[];
}): Plan {
  const { dayStart, dayEnd, tasks } = input;
  const from = Math.min(dayEnd, roundUp5(Math.max(dayStart, input.from ?? dayStart)));
  const open = tasks.filter((t) => !t.done);

  // 1. Fixed tasks.
  const fixed = open
    .filter((t) => t.fixedStart !== null)
    .sort((a, b) => a.fixedStart! - b.fixedStart! || a.position - b.position);
  const blocks: Block[] = [];
  let latestEnd = -1;
  for (const task of fixed) {
    const start = task.fixedStart!;
    const end = start + task.minutes;
    blocks.push({ type: "task", task, start, end, cushion: 0, conflict: start < latestEnd });
    latestEnd = Math.max(latestEnd, end);
  }

  // Free gaps between `from` and the end of the day, around fixed tasks.
  const gaps: Gap[] = [];
  let cursor = from;
  for (const block of blocks) {
    if (block.start > cursor) gaps.push({ start: cursor, end: Math.min(block.start, dayEnd), cursor, streak: 0 });
    cursor = Math.max(cursor, block.end);
  }
  if (dayEnd > cursor) gaps.push({ start: cursor, end: dayEnd, cursor, streak: 0 });
  const usableGaps = gaps.filter((g) => g.end > g.start);
  const availableMinutes = usableGaps.reduce((sum, g) => sum + (g.end - g.start), 0);

  // 2-4. Flexible tasks, first fit, with cushions and breaks.
  const flexible = open
    .filter((t) => t.fixedStart === null)
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.position - b.position);
  const overflow: PlannerTask[] = [];
  let usedMinutes = 0;

  for (const task of flexible) {
    const cushion = cushionFor(task);
    const length = task.minutes + cushion;
    let placed = false;
    for (const gap of usableGaps) {
      const wantsBreak = gap.streak > 0 && gap.streak + length > BREAK_AFTER;
      if (wantsBreak && gap.cursor + BREAK_MINUTES + length <= gap.end) {
        blocks.push({ type: "break", start: gap.cursor, end: gap.cursor + BREAK_MINUTES });
        gap.cursor += BREAK_MINUTES;
        gap.streak = 0;
        usedMinutes += BREAK_MINUTES;
      } else if (gap.cursor + length > gap.end) {
        continue;
      }
      blocks.push({ type: "task", task, start: gap.cursor, end: gap.cursor + length, cushion, conflict: false });
      gap.cursor += length;
      gap.streak += length;
      usedMinutes += length;
      placed = true;
      break;
    }
    if (!placed) overflow.push(task);
  }

  blocks.sort((a, b) => a.start - b.start || (a.type === "break" ? -1 : 1));
  return { blocks, overflow, availableMinutes, usedMinutes };
}

/** "07:30" or "07:30:00" -> 450. */
export function parseTime(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** 450 -> "07:30". Wraps past midnight for display. */
export function formatTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 95 -> "1h 35m", 45 -> "45m", 120 -> "2h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

/** Today's date ("YYYY-MM-DD") and the current minute of the day in `timezone`. */
export function nowIn(timezone: string, date = new Date()): { day: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** "2026-09-30" + 1 -> "2026-10-01". Pure calendar arithmetic, no timezone. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
