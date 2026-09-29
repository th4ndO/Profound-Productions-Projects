"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addTask } from "./actions";
import styles from "./plan.module.css";

const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];

export function AddTaskForm({ day }: { day: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [kind, setKind] = useState<"must" | "nice">("must");
  const [hasTime, setHasTime] = useState(false);
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addTask({ day, title, minutes, kind, fixedStart: hasTime ? time : null });
      if (result.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setHasTime(false);
      router.refresh();
    });
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h3 className={styles.cardTitle}>Add a task</h3>
      <label className={styles.field}>
        What do you need to do?
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          placeholder="e.g. Finish assignment, buy groceries"
        />
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          How long?
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {DURATIONS.map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} hour${m === 60 ? "" : "s"}`}
              </option>
            ))}
          </select>
        </label>
        <fieldset className={styles.segment}>
          <legend>How important?</legend>
          <label>
            <input type="radio" checked={kind === "must"} onChange={() => setKind("must")} />
            Must do
          </label>
          <label>
            <input type="radio" checked={kind === "nice"} onChange={() => setKind("nice")} />
            Nice to do
          </label>
        </fieldset>
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={hasTime} onChange={(e) => setHasTime(e.target.checked)} />
        It happens at a set time
      </label>
      {hasTime && (
        <label className={styles.field}>
          Starts at
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      )}
      <button type="submit" className={styles.btn} disabled={pending}>
        {pending ? "Adding…" : "Add to my day"}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
