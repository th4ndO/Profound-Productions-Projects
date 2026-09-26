"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startAnonymousSession } from "./actions";
import styles from "./start.module.css";

export function StartSession({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const started = useRef(false);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await startAnonymousSession();
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }, [next, router]);

  useEffect(() => {
    // React strict mode runs effects twice in dev; only start once.
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  if (error) {
    return (
      <>
        <p className={styles.error} role="alert">
          Couldn&apos;t get started: {error}
        </p>
        <button type="button" className={styles.btn} onClick={() => void start()} disabled={busy}>
          Try again
        </button>
      </>
    );
  }

  return <p className={styles.sub}>Getting things ready…</p>;
}
