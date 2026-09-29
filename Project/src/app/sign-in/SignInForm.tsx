"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "./actions";
import styles from "./sign-in.module.css";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unsavedGoals, setUnsavedGoals] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUnsavedGoals(false);
    startTransition(async () => {
      const result = await signInWithEmail(email, password);
      if (result.error) {
        setError(result.error);
        setUnsavedGoals(Boolean(result.unsavedGoals));
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className={styles.btn} disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && (
        <p className={styles.error} role="alert">
          {error} {unsavedGoals && <Link href="/settings">Go to Settings</Link>}
        </p>
      )}
      <p className={styles.sub}>
        No account? <Link href="/">Just start</Link>. You can save your goals to an account later
        in Settings.
      </p>
    </>
  );
}
