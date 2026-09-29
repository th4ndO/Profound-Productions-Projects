"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { carryOverUnfinished } from "./actions";
import styles from "./plan.module.css";

export function CarryOver({ today, count }: { today: string; count: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className={`${styles.card} ${styles.notice}`}>
      <p>
        You have {count} unfinished task{count === 1 ? "" : "s"} from earlier days.
      </p>
      <button
        type="button"
        className={styles.btn}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await carryOverUnfinished(today);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Bringing them over…" : "Bring them to today"}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
