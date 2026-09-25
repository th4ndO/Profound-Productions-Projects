"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoalVisual, THEMES, THEME_NAMES, type Theme } from "@/components/visuals/GoalVisual";
import { gProg, mProg, pct } from "@/lib/progress";
import { statusLine } from "@/lib/status";
import { dueStatus, dueStatusText, fmtDate, pushedDueDate } from "@/lib/due";
import type { GoalDetail } from "@/lib/goal-types";
import type { ReminderRule } from "@/lib/reminder-types";
import { ReminderSettings } from "./ReminderSettings";
import {
  addMilestone,
  addTask,
  deleteGoal,
  deleteMilestone,
  deleteTask,
  pushDueDate,
  setGoalTheme,
  toggleMilestone,
  toggleTask,
} from "../actions";
import styles from "./goal-detail.module.css";

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" width="14" height="14">
      <path
        d="M3 8.5l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * All the interaction logic for a goal's page: toggling milestones/tasks
 * (with the exact cascade rules from reference/groundwork.html), adding
 * and removing milestones/tasks, switching the visual theme, pushing the
 * due date out a week, and the two-tap delete.
 *
 * Every mutation follows the prototype's `update(g, fn, focusSel)`
 * pattern: apply the change to local state immediately (optimistic UI),
 * pulse the visual if progress just went up, then persist via a Server
 * Action — rolling the local state back and showing an error if that
 * write fails.
 */
export function GoalDetailClient({
  goal: initialGoal,
  reminderRule,
}: {
  goal: GoalDetail;
  reminderRule: ReminderRule | null;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();
  const heroRef = useRef<HTMLDivElement>(null);

  const p = gProg(goal);
  const due = dueStatus(goal.due_at, p);

  function pulse() {
    const el = heroRef.current;
    if (!el) return;
    el.classList.remove(styles.grew);
    // Force a reflow so re-adding the class restarts the CSS animation,
    // exactly like the prototype's pulse(): remove -> reflow -> add.
    void el.offsetWidth;
    el.classList.add(styles.grew);
  }

  /**
   * Shared optimistic-update helper. `mutate` is a pure function producing
   * the next local state; `persist` performs the actual write. If
   * `persist` throws, we roll back to the pre-mutation state and surface
   * the error.
   */
  function applyOptimistic(mutate: (g: GoalDetail) => GoalDetail, persist: () => Promise<void>) {
    setConfirmDelete(false);
    setError(null);
    const before = goal;
    const beforeProgress = gProg(before);
    const next = mutate(before);
    setGoal(next);
    if (gProg(next) > beforeProgress) pulse();

    startTransition(() => {
      persist().catch((err: unknown) => {
        setGoal(before);
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      });
    });
  }

  function handleToggleMilestone(milestoneId: string) {
    applyOptimistic(
      (g) => ({
        ...g,
        milestones: g.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const complete = mProg(m) === 1;
          const newDone = !complete;
          return { ...m, done: newDone, tasks: m.tasks.map((t) => ({ ...t, done: newDone })) };
        }),
      }),
      () => toggleMilestone(goal.id, milestoneId),
    );
  }

  function handleToggleTask(milestoneId: string, taskId: string) {
    applyOptimistic(
      (g) => ({
        ...g,
        milestones: g.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const tasks = m.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
          const toggledTask = tasks.find((t) => t.id === taskId);
          // Ported from the prototype: `t.done = !t.done; if(!t.done) m.done = false;`
          const newMilestoneDone = toggledTask && !toggledTask.done ? false : m.done;
          return { ...m, done: newMilestoneDone, tasks };
        }),
      }),
      () => toggleTask(goal.id, milestoneId, taskId),
    );
  }

  function handleAddMilestone() {
    const title = milestoneDraft.trim();
    if (!title) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    setMilestoneDraft("");
    applyOptimistic(
      (g) => ({ ...g, milestones: [...g.milestones, { id: tempId, title, done: false, tasks: [] }] }),
      async () => {
        const created = await addMilestone(goal.id, title);
        setGoal((g) => ({
          ...g,
          milestones: g.milestones.map((m) => (m.id === tempId ? { ...m, id: created.id } : m)),
        }));
      },
    );
  }

  function handleAddTask(milestoneId: string) {
    const title = (taskDrafts[milestoneId] ?? "").trim();
    if (!title) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    setTaskDrafts((d) => ({ ...d, [milestoneId]: "" }));
    applyOptimistic(
      (g) => ({
        ...g,
        milestones: g.milestones.map((m) =>
          m.id === milestoneId
            ? { ...m, done: false, tasks: [...m.tasks, { id: tempId, title, done: false }] }
            : m,
        ),
      }),
      async () => {
        const created = await addTask(goal.id, milestoneId, title);
        setGoal((g) => ({
          ...g,
          milestones: g.milestones.map((m) =>
            m.id === milestoneId
              ? { ...m, tasks: m.tasks.map((t) => (t.id === tempId ? { ...t, id: created.id } : t)) }
              : m,
          ),
        }));
      },
    );
  }

  function handleDeleteMilestone(milestoneId: string) {
    applyOptimistic(
      (g) => ({ ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) }),
      () => deleteMilestone(goal.id, milestoneId),
    );
  }

  function handleDeleteTask(milestoneId: string, taskId: string) {
    applyOptimistic(
      (g) => ({
        ...g,
        milestones: g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) } : m,
        ),
      }),
      () => deleteTask(goal.id, taskId),
    );
  }

  function handleTheme(theme: Theme) {
    if (theme === goal.theme) return;
    applyOptimistic(
      (g) => ({ ...g, theme }),
      () => setGoalTheme(goal.id, theme),
    );
  }

  function handlePush() {
    applyOptimistic(
      (g) => ({ ...g, due_at: pushedDueDate(g.due_at).toISOString() }),
      async () => {
        const newDue = await pushDueDate(goal.id);
        setGoal((g) => ({ ...g, due_at: newDue }));
      },
    );
  }

  function handleDeleteGoal() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteGoal(goal.id);
        router.push("/");
      } catch (err) {
        setConfirmDelete(false);
        setError(err instanceof Error ? err.message : "Could not delete this goal. Try again.");
      }
    });
  }

  function onAdderKeyDown(e: KeyboardEvent<HTMLInputElement>, onEnter: () => void) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onEnter();
  }

  return (
    <div className={styles.wrap}>
      <Link href="/" className={styles.link}>
        ‹ All goals
      </Link>

      <div className={styles.hero} ref={heroRef}>
        <GoalVisual theme={goal.theme} p={p} label={`${goal.title} visual, ${pct(p)} percent`} />
      </div>

      <h1 className={styles.title}>{goal.title}</h1>
      <p className={styles.meta}>{statusLine(goal)}</p>

      {goal.due_at && (
        <div className={styles.due}>
          <span className={styles.meta}>
            Target: {fmtDate(goal.due_at)}
            {due.kind !== "none" && (
              <>
                {" · "}
                {due.kind === "late" ? (
                  <span className={styles.late}>{dueStatusText(due)}</span>
                ) : (
                  dueStatusText(due)
                )}
              </>
            )}
          </span>
          {due.kind === "late" && (
            <button type="button" className={styles.link} onClick={handlePush}>
              Give myself another week
            </button>
          )}
        </div>
      )}

      {goal.reward &&
        (p >= 1 ? (
          <div className={`${styles.prize} ${styles.prizeWon}`}>
            <strong>Reward unlocked</strong>
            {goal.reward}. You earned it.
          </div>
        ) : (
          <div className={styles.prize}>
            <strong>Your reward</strong>
            {goal.reward}. Unlocks when every milestone is done.
          </div>
        ))}

      <div className={styles.themes} role="group" aria-label="Visual style">
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.chip}
            aria-pressed={goal.theme === t}
            onClick={() => handleTheme(t)}
          >
            {THEME_NAMES[t]}
          </button>
        ))}
      </div>

      <ReminderSettings goalId={goal.id} initialRule={reminderRule} />

      <h2 className={styles.sectionLabel}>Milestones</h2>
      <ol className={styles.msList}>
        {goal.milestones.map((m, i) => {
          const complete = mProg(m) === 1;
          return (
            <li key={m.id} className={styles.msItem}>
              <div className={styles.mhead}>
                <span className={styles.num} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={styles.mtitle}>{m.title}</span>
                {m.tasks.length > 0 && (
                  <span className={styles.meta}>
                    {m.tasks.filter((t) => t.done).length}/{m.tasks.length}
                  </span>
                )}
                <button
                  type="button"
                  className={`${styles.check} ${complete ? styles.checkOn : ""}`}
                  aria-label={complete ? "Mark milestone not done" : "Mark milestone done"}
                  aria-pressed={complete}
                  onClick={() => handleToggleMilestone(m.id)}
                >
                  {complete && <CheckIcon />}
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label="Remove milestone"
                  onClick={() => handleDeleteMilestone(m.id)}
                >
                  ✕
                </button>
              </div>

              {m.tasks.length > 0 && (
                <ul className={styles.tasks}>
                  {m.tasks.map((t) => (
                    <li key={t.id} className={t.done ? styles.taskDone : undefined}>
                      <button
                        type="button"
                        className={`${styles.check} ${styles.taskCheck} ${t.done ? styles.checkOn : ""}`}
                        aria-label={t.done ? "Mark task not done" : "Mark task done"}
                        aria-pressed={t.done}
                        onClick={() => handleToggleTask(m.id, t.id)}
                      >
                        {t.done && <CheckIcon />}
                      </button>
                      <span>{t.title}</span>
                      <button
                        type="button"
                        className={styles.taskRemove}
                        aria-label="Remove task"
                        onClick={() => handleDeleteTask(m.id, t.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.adder}>
                <input
                  value={taskDrafts[m.id] ?? ""}
                  onChange={(e) => setTaskDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                  onKeyDown={(e) => onAdderKeyDown(e, () => handleAddTask(m.id))}
                  placeholder="Add a task"
                  maxLength={100}
                  aria-label={`Add a task to ${m.title}`}
                />
                <button type="button" onClick={() => handleAddTask(m.id)}>
                  Add
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className={styles.adder}>
        <input
          value={milestoneDraft}
          onChange={(e) => setMilestoneDraft(e.target.value)}
          onKeyDown={(e) => onAdderKeyDown(e, handleAddMilestone)}
          placeholder="Add a milestone"
          maxLength={100}
          aria-label="Add a milestone"
        />
        <button type="button" onClick={handleAddMilestone}>
          Add
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.dangerZone}>
        <button type="button" className={styles.danger} onClick={handleDeleteGoal}>
          {confirmDelete ? "Tap again to delete this goal" : "Delete goal"}
        </button>
      </div>
    </div>
  );
}
