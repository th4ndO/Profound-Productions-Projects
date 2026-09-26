"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getExistingSubscription } from "@/lib/push-client";
import { signOutAndErase } from "./actions";
import styles from "./settings.module.css";

/**
 * Sign out of this device. With anonymous accounts there is nothing to sign
 * back in to, so this erases the user's data first (see signOutAndErase).
 * Two taps, like deleting a goal: the first arms it, the second erases.
 */
export function SignOutSection() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        // Stop this browser receiving pushes. Best-effort: the server-side
        // subscription row is deleted by signOutAndErase regardless.
        try {
          const subscription = await getExistingSubscription();
          await subscription?.unsubscribe();
        } catch {
          // ignore: the server delete below is what stops reminders
        }
        await signOutAndErase();
        // Drop cached pages from the erased session; with no session the
        // app then starts a fresh, empty one via /start.
        router.replace("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't sign out.");
        setArmed(false);
      }
    });
  }

  return (
    <>
      <p className={styles.meta}>
        Signing out erases your goals, reminders and settings from Groundwork and turns off
        notifications on this device. There&apos;s no account to sign back in to, so this
        can&apos;t be undone.
      </p>
      <div className={styles.signOutRow}>
        <button type="button" className={styles.danger} onClick={handleClick} disabled={pending}>
          {pending ? "Erasing…" : armed ? "Tap again to erase and sign out" : "Sign out of this device"}
        </button>
        {armed && !pending && (
          <button type="button" className={styles.cancel} onClick={() => setArmed(false)}>
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
