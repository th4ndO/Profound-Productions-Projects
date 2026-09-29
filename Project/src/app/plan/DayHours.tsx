"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveDayHours } from "./actions";
import styles from "./plan.module.css";

export function DayHours({ dayStart, dayEnd }: { dayStart: string; dayEnd: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(dayStart);
  const [end, setEnd] = useState(dayEnd);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveDayHours(start, end);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <p className={styles.hours}>
        Your day runs {dayStart} to {dayEnd}.{" "}
        <button type="button" className={styles.linkBtn} onClick={() => setEditing(true)}>
          Change
        </button>
      </p>
    );
  }

  return (
    <form className={styles.hoursForm} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Day starts
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
      </label>
      <label className={styles.field}>
        Day ends
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
      </label>
      <button type="submit" className={styles.btn} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" className={styles.ghost} onClick={() => setEditing(false)}>
        Cancel
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
