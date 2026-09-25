"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./sign-in.module.css";

const MIN_PASSWORD_LENGTH = 8;

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
    </svg>
  );
}

/** Supabase's raw auth errors, reworded for people. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the link we sent.";
  }
  if (m.includes("already registered")) {
    return "There's already an account with that email. Sign in instead.";
  }
  if (m.includes("rate limit")) return "Too many attempts. Wait a few minutes and try again.";
  return message;
}

export function SignInForm({
  initialError,
  next,
}: {
  initialError?: string;
  next?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "confirm-email">("idle");
  const [error, setError] = useState<string | null>(
    initialError ? "That link didn't work. Try signing in again." : null,
  );

  // Only ever redirect to a relative path — never let an arbitrary `next`
  // value (attacker-controlled query param) become an open redirect.
  const safeNext = next && next.startsWith("/") ? next : "/";
  const signingUp = mode === "sign-up";

  function switchMode() {
    setMode(signingUp ? "sign-in" : "sign-up");
    setError(null);
    setConfirm("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (signingUp) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
        return;
      }
      if (password !== confirm) {
        setError("Those passwords don't match.");
        return;
      }
    }

    setStatus("busy");

    // Auth calls resolve with an error for API failures but can throw on a
    // network failure — without the catch the button would stay busy forever.
    try {
      const supabase = createClient();

      if (signingUp) {
        // If "Confirm email" is on in Supabase, the confirmation link lands on
        // /auth/callback, which signs the user in and forwards to `next`.
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("next", safeNext);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl.toString() },
        });
        if (signUpError) throw signUpError;

        // Supabase answers a sign-up for an already-registered email with a
        // user that has no identities (so it doesn't leak who has accounts).
        if (data.user && data.user.identities?.length === 0) {
          throw new Error("already registered");
        }
        if (!data.session) {
          setStatus("confirm-email");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      router.replace(safeNext);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.toLowerCase().includes("fetch")
          ? "Couldn't reach the server. Check your connection and try again."
          : friendlyError(message),
      );
      setStatus("idle");
    }
  }

  if (status === "confirm-email") {
    return (
      <div className={styles.confirm} role="status">
        <MailIcon className={styles.confirmIcon} />
        <h2>Confirm your email</h2>
        <p>
          We sent a confirmation link to <strong>{email}</strong>. Open it to
          finish creating your account.
        </p>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => {
            setStatus("idle");
            setMode("sign-in");
          }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const busy = status === "busy";

  return (
    <form onSubmit={handleSubmit}>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <div className={styles.inputWrap}>
          <MailIcon />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="password">Password</label>
        <div className={styles.inputWrap}>
          <LockIcon />
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={signingUp ? MIN_PASSWORD_LENGTH : undefined}
            autoComplete={signingUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      {signingUp ? (
        <div className={styles.field}>
          <label htmlFor="confirm">Confirm password</label>
          <div className={styles.inputWrap}>
            <LockIcon />
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
      ) : null}
      <button type="submit" className={styles.btn} disabled={busy}>
        {busy ? (signingUp ? "Creating account…" : "Signing in…") : signingUp ? "Create account" : "Sign in"}
      </button>
      <p className={styles.switch}>
        {signingUp ? "Already have an account?" : "New to Groundwork?"}{" "}
        <button type="button" className={styles.linkBtn} onClick={switchMode}>
          {signingUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
