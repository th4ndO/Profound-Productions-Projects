"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDuration, formatTime, type Block, type PlannerTask } from "@/lib/planner";
import { moveTask, removeTask, setTaskDone, tickGoalStep, type StepOffer } from "./actions";
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
  // Ticks show straight away; the list re-sorts when the server confirms.
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  // After ticking goal time: offer to tick that goal's next step as well.
  const [offer, setOffer] = useState<StepOffer | null>(null);
  const [offerDone, setOfferDone] = useState<string | null>(null);

  function toggle(task: PlannerTask, done: boolean) {
    setTicked((t) => ({ ...t, [task.id]: done }));
    setError(null);
    startTransition(async () => {
      const result = await setTaskDone(task.id, done);
      if (result.error) {
        setTicked((t) => ({ ...t, [task.id]: !done }));
        setError(result.error);
      } else {
        setOfferDone(null);
        setOffer(result.offer ?? null);
        router.refresh();
      }
    });
  }

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

  function acceptOffer(o: StepOffer) {
    setError(null);
    startTransition(async () => {
      const result = await tickGoalStep(o.goalId, o.stepKind, o.stepId);
      if (result.error) setError(result.error);
      else {
        setOffer(null);
        setOfferDone(`Ticked "${o.stepTitle}" on ${o.goalTitle}.`);
      }
    });
  }

  return (
    <>
      {offer && (
        <div className={styles.offer} role="status">
          <p>
            Nice work on <strong>{offer.goalTitle}</strong>. Did you also finish its next step:{" "}
            <em>{offer.stepTitle}</em>?
          </p>
          <div className={styles.offerActions}>
            <button type="button" className={styles.btn} disabled={pending} onClick={() => acceptOffer(offer)}>
              Yes, tick it
            </button>
            <button type="button" className={styles.linkBtn} onClick={() => setOffer(null)}>
              Not yet
            </button>
          </div>
        </div>
      )}
      {offerDone && (
        <p className={styles.offer} role="status">
          {offerDone}
        </p>
      )}
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
                      checked={ticked[block.task.id] ?? false}
                      onChange={(e) => toggle(block.task, e.target.checked)}
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
                    checked={ticked[task.id] ?? true}
                    onChange={(e) => toggle(task, e.target.checked)}
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
