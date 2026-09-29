"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDuration, formatTime, type Block, type PlannerTask } from "@/lib/planner";
import { moveTask, removeTask, setTaskDone } from "./actions";
import styles from "./plan.module.css";

const KIND_LABEL = { must: "Must do", nice: "Nice to do", goal: "Goal" } as const;

export function Timeline({
  day,
  tomorrow,
  today,
  blocks,
  overflow,
  done,
  isPast,
}: {
  day: string;
  tomorrow: string;
  today: string;
  blocks: Block[];
  overflow: PlannerTask[];
  done: PlannerTask[];
  isPast: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  const moveTarget = isPast ? today : tomorrow;
  const moveLabel = isPast ? "Move to today" : "Move to tomorrow";

  function taskActions(task: PlannerTask) {
    return (
      <div className={styles.taskActions}>
        {day !== moveTarget && (
          <button type="button" className={styles.linkBtn} disabled={pending} onClick={() => run(() => moveTask(task.id, moveTarget))}>
            {moveLabel}
          </button>
        )}
        <button type="button" className={styles.linkBtn} disabled={pending} onClick={() => run(() => removeTask(task.id))}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {blocks.length > 0 && (
        <ol className={styles.timeline} aria-label="Your plan">
          {blocks.map((block) =>
            block.type === "break" ? (
              <li key={`break-${block.start}`} className={styles.breakRow}>
                <span className={styles.time}>{formatTime(block.start)}</span>
                <span>Break · {formatDuration(block.end - block.start)}</span>
              </li>
            ) : (
              <li
                key={block.task.id}
                className={`${styles.item} ${styles[block.task.kind]} ${block.conflict ? styles.conflict : ""}`}
              >
                <span className={styles.time}>
                  {formatTime(block.start)}
                  <small>{formatTime(block.end)}</small>
                </span>
                <div className={styles.itemBody}>
                  <label className={styles.itemTitle}>
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={pending}
                      onChange={() => run(() => setTaskDone(block.task.id, true))}
                      aria-label={`Mark ${block.task.title} done`}
                    />
                    {block.task.title}
                  </label>
                  <p className={styles.itemMeta}>
                    {KIND_LABEL[block.task.kind]} · {formatDuration(block.task.minutes)}
                    {block.cushion > 0 && ` + ${block.cushion}m spare`}
                    {block.task.fixedStart !== null && " · set time"}
                    {block.conflict && " · overlaps another appointment"}
                  </p>
                  {taskActions(block.task)}
                </div>
              </li>
            ),
          )}
        </ol>
      )}

      {overflow.length > 0 && (
        <section className={`${styles.card} ${styles.overflow}`}>
          <h3 className={styles.cardTitle}>{isPast ? "Not done" : "Won't fit"}</h3>
          <ul className={styles.plainList}>
            {overflow.map((task) => (
              <li key={task.id}>
                <span className={styles.itemTitle}>
                  {task.title}
                  {task.kind === "must" && !isPast && <strong className={styles.mustBadge}>Must do</strong>}
                </span>
                <span className={styles.itemMeta}>{formatDuration(task.minutes)}</span>
                {taskActions(task)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Done</h3>
          <ul className={styles.plainList}>
            {done.map((task) => (
              <li key={task.id}>
                <label className={`${styles.itemTitle} ${styles.doneTitle}`}>
                  <input
                    type="checkbox"
                    checked
                    disabled={pending}
                    onChange={() => run(() => setTaskDone(task.id, false))}
                    aria-label={`Mark ${task.title} not done`}
                  />
                  {task.title}
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
