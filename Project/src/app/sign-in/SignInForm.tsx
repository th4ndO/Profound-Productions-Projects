"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./sign-in.module.css";

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

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className={styles.confirm}>
        <h2>Check your email</h2>
        <p>
          We sent a magic link to <strong>{email}</strong>. Open it on this
          device to sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
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
      <button type="submit" className={styles.btn} disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
