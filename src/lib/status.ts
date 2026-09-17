import { gProg, mProg, pct, type Goal } from "./progress";

/**
 * A goal's status line, ported 1:1 from reference/groundwork.html's
 * `statusLine(g)`:
 *
 * `const p = gProg(g), total = g.milestones.length, done = g.milestones.filter(m=>mProg(m)===1).length;`
 * `if(!total) return "Add your first milestone";`
 * `if(p >= 1) return \`All ${total} milestones done\`;`
 * `return \`${done} of ${total} milestones done · ${pct(p)}%\`;`
 */
export function statusLine(goal: Goal): string {
  const total = goal.milestones.length;
  if (!total) return "Add your first milestone";
  const p = gProg(goal);
  if (p >= 1) return `All ${total} milestones done`;
  const done = goal.milestones.filter((m) => mProg(m) === 1).length;
  return `${done} of ${total} milestones done · ${pct(p)}%`;
}
