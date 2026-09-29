"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addGoalBlocks } from "./actions";
import styles from "./plan.module.css";

const GOAL_MINUTES = [15, 30, 45, 60, 90];

/**
 * Makes sure goals get time: every active goal not yet on this day's plan
 * is listed, ticked by default, with a time box to add in one tap.
 */
export function GoalPicker({ day, goals }: { day: string; goals: { id: string; title: string }[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(goals.map((g) => [g.id, true])),
  );
  const [minutes, setMinutes] = useState<Record<string, number>>(() =>
    Object.fromEntries(goals.map((g) => [g.id, 30])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const count = goals.filter((g) => chosen[g.id] ?? true).length;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const blocks = goals
        .filter((g) => chosen[g.id] ?? true)
        .map((g) => ({ goalId: g.id, title: g.title, minutes: minutes[g.id] ?? 30 }));
      const result = await addGoalBlocks(day, blocks);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Make time for your goals</h3>
      <ul className={styles.goalList}>
        {goals.map((g) => (
          <li key={g.id}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={chosen[g.id] ?? true}
                onChange={(e) => setChosen((c) => ({ ...c, [g.id]: e.target.checked }))}
              />
              {g.title}
            </label>
            <select
              aria-label={`Time for ${g.title}`}
              value={minutes[g.id] ?? 30}
              onChange={(e) => setMinutes((m) => ({ ...m, [g.id]: Number(e.target.value) }))}
            >
              {GOAL_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} h`}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.btn} onClick={handleAdd} disabled={pending || count === 0}>
        {pending ? "Adding…" : count === 1 ? "Add 1 goal to my day" : `Add ${count} goals to my day`}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
