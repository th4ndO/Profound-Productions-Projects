/**
 * Progress rules, ported faithfully from reference/groundwork.html's
 * `mProg`, `gProg`, and `pct` functions (see the <script> block there).
 *
 * Do not change the math here without checking against the prototype —
 * it is the source of truth for these rules (see BUILD SPEC §1, §3).
 */

/** A single checkable item inside a milestone. */
export interface Task {
  done: boolean;
}

/**
 * A milestone inside a goal. `done` is an explicit override: marking a
 * milestone done directly (independent of its tasks) forces its progress
 * to 1, exactly as the prototype's `mProg` does.
 */
export interface Milestone {
  done: boolean;
  tasks: Task[];
}

/** A goal, made up of milestones. */
export interface Goal {
  milestones: Milestone[];
}

/**
 * A milestone's progress: 1 if marked done, otherwise done tasks / total
 * tasks (0 if it has no tasks).
 *
 * Ported 1:1 from the prototype:
 * `function mProg(m){ if(m.done) return 1; if(!m.tasks.length) return 0; return m.tasks.filter(t=>t.done).length / m.tasks.length; }`
 */
export function mProg(m: Milestone): number {
  if (m.done) return 1;
  if (!m.tasks.length) return 0;
  return m.tasks.filter((t) => t.done).length / m.tasks.length;
}

/**
 * A goal's progress: the unweighted average of its milestones' progress
 * (not weighted by task count), 0 if it has no milestones.
 *
 * Ported 1:1 from the prototype:
 * `function gProg(g){ if(!g.milestones.length) return 0; return g.milestones.reduce((a,m)=>a+mProg(m),0) / g.milestones.length; }`
 */
export function gProg(g: Goal): number {
  if (!g.milestones.length) return 0;
  return g.milestones.reduce((a, m) => a + mProg(m), 0) / g.milestones.length;
}

/**
 * Formats a 0..1 progress fraction as a whole-number percentage.
 *
 * Ported 1:1 from the prototype: `function pct(p){ return Math.round(p*100); }`
 */
export function pct(p: number): number {
  return Math.round(p * 100);
}
