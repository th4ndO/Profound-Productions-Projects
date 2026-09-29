"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getExistingSubscription } from "@/lib/push-client";
import { PASSWORD_MIN_LENGTH } from "@/lib/account";
import { changePassword, saveAccount, signOutOfAccount } from "./actions";
import styles from "./settings.module.css";

/**
 * "Your account": save this browser's anonymous account with an email and
 * password, or, once saved, change the password and sign out (nothing is
 * erased; the user signs back in on /sign-in).
 */
export function AccountSection({ email }: { email: string | null }) {
  return email ? <SavedAccount email={email} /> : <SaveAccountForm />;
}

function SaveAccountForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveAccount(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <p className={styles.meta}>
        Right now your goals belong to this browser only. Save them to an account to sign in on
        another phone or computer, and so they&apos;re never lost if this browser&apos;s data is
        cleared. Everything you&apos;ve added stays.
      </p>
      <form onSubmit={handleSubmit}>
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
          Password (at least {PASSWORD_MIN_LENGTH} characters)
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          Show password
        </label>
        <p className={styles.meta}>
          There&apos;s no &quot;forgot password&quot; email, so keep your password somewhere safe.
        </p>
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save my account"}
        </button>
      </form>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={`${styles.meta} ${styles.after}`}>
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </>
  );
}

function SavedAccount({ email }: { email: string }) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await changePassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPassword("");
      setChanging(false);
      setMessage("Password changed.");
    });
  }

  function handleSignOut() {
    setError(null);
    startTransition(async () => {
      let subscription: PushSubscription | null = null;
      try {
        subscription = await getExistingSubscription();
      } catch {
        // no push on this browser
      }
      const result = await signOutOfAccount(subscription?.endpoint ?? null);
      if (result.error) {
        setError(result.error);
        return;
      }
      try {
        await subscription?.unsubscribe();
      } catch {
        // best-effort: the server row is already gone
      }
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return (
    <>
      <p className={styles.meta}>
        Signed in as <strong>{email}</strong>. Sign in with this email on any device to see your
        goals.
      </p>
      {changing ? (
        <form onSubmit={handleChangePassword}>
          <label className={styles.field}>
            New password (at least {PASSWORD_MIN_LENGTH} characters)
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className={styles.signOutRow}>
            <button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save new password"}
            </button>
            <button type="button" className={styles.cancel} onClick={() => setChanging(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.signOutRow}>
          <button type="button" className={styles.cancel} onClick={() => setChanging(true)}>
            Change password
          </button>
          <button type="button" className={styles.cancel} onClick={handleSignOut} disabled={pending}>
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
      {message && <p className={`${styles.meta} ${styles.after}`}>{message}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
