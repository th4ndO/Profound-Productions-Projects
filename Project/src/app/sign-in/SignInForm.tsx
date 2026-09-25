"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./sign-in.module.css";

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function SignInForm({
  initialError,
  next,
}: {
  initialError?: string;
  next?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    initialError ? "That link didn't work. Try sending a new one." : null,
  );

  // Only ever forward a relative path — never let an arbitrary `next` value
  // (attacker-controlled query param) turn into an open redirect through
  // the magic-link email.
  const safeNext = next && next.startsWith("/") ? next : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("sending");

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (safeNext) {
      callbackUrl.searchParams.set("next", safeNext);
    }

    // signInWithOtp resolves with an error for API failures but can throw on
    // a network failure — without the catch the button would sit on
    // "Sending…" forever.
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (otpError) {
        setError(otpError.message);
        setStatus("idle");
        return;
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setStatus("idle");
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className={styles.confirm} role="status">
        <MailIcon className={styles.confirmIcon} />
        <h2>Check your email</h2>
        <p>
          We sent a magic link to <strong>{email}</strong>. Open it on this
          device, in this browser, to sign in.
        </p>
        <button type="button" className={styles.linkBtn} onClick={() => setStatus("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <p className={styles.error}>{error}</p> : null}
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
      <button type="submit" className={styles.btn} disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
