/**
 * "Days left / overdue" text, ported from reference/groundwork.html's
 * `dueText(g)`:
 *
 * `if(!g.dueAt || gProg(g) >= 1) return "";`
 * `const d = Math.ceil((g.dueAt - Date.now())/DAY);`
 * `if(d > 1) return \`${d} days left\`;`
 * `if(d === 1) return "Due tomorrow";`
 * `if(d === 0) return "Due today";`
 * `return \`<span class="late">${-d} days past your target</span>\`;`
 *
 * Rule 4 (no punishment): this is purely display text derived from the
 * target date — it never feeds back into progress or the visual.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export type DueStatus =
  | { kind: "none" }
  | { kind: "days-left"; days: number }
  | { kind: "due-tomorrow" }
  | { kind: "due-today" }
  | { kind: "late"; daysPast: number };

/** `progress` is `gProg(goal)`, a 0..1 fraction. */
export function dueStatus(dueAt: string | null, progress: number): DueStatus {
  if (!dueAt || progress >= 1) return { kind: "none" };
  const d = Math.ceil((new Date(dueAt).getTime() - Date.now()) / DAY_MS);
  if (d > 1) return { kind: "days-left", days: d };
  if (d === 1) return { kind: "due-tomorrow" };
  if (d === 0) return { kind: "due-today" };
  return { kind: "late", daysPast: -d };
}

export function dueStatusText(status: DueStatus): string {
  switch (status.kind) {
    case "none":
      return "";
    case "days-left":
      return `${status.days} days left`;
    case "due-tomorrow":
      return "Due tomorrow";
    case "due-today":
      return "Due today";
    case "late":
      return `${status.daysPast} days past your target`;
  }
}

/** Ported from the prototype's `fmtDate(t)`. */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The new due date for the "push" / "Give myself another week" action.
 * Ported 1:1 from the prototype's `push` case:
 * `x.dueAt = Math.max(x.dueAt||Date.now(), Date.now()) + 7*DAY;`
 * i.e. 7 days past today OR 7 days past the current target, whichever is
 * later.
 */
export function pushedDueDate(currentDueAt: string | null, now: number = Date.now()): Date {
  const current = currentDueAt ? new Date(currentDueAt).getTime() : now;
  return new Date(Math.max(current, now) + 7 * DAY_MS);
}
