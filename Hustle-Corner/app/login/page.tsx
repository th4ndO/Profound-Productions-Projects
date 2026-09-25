"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/config";
import { passwordRequirements, isStrongPassword } from "@/lib/validation";

type Mode = "login" | "signup";
type Status = "idle" | "submitting" | "error" | "check-email";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const requirements = passwordRequirements(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmitSignup = isStrongPassword(password) && passwordsMatch;

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setConfirmPassword("");
    setStatus("idle");
    setErrorMessage("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (mode === "signup" && !canSubmitSignup) {
      setStatus("error");
      setErrorMessage(
        !isStrongPassword(password)
          ? "Choose a stronger password."
          : "Passwords don't match.",
      );
      return;
    }

    setStatus("submitting");
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation is disabled on this project — signUp already
      // returned a live session.
      router.push("/");
      router.refresh();
      return;
    }
    setStatus("check-email");
  }

  if (status === "check-email") {
    return (
      <main className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Confirm your email</h1>
        <p className="mt-2 text-gray-600">
          We sent a confirmation link to <strong>{email}</strong>. Open it on
          this device to finish signing up.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold">
        {mode === "login" ? `Log in to ${APP_NAME}` : `Sign up for ${APP_NAME}`}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {mode === "login"
          ? "Welcome back."
          : "Create an account to leave reviews or list your services."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Create a password" : "Password"}
            className={inputClassName}
          />
          {mode === "signup" && password.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs">
              {requirements.map((r) => (
                <li
                  key={r.label}
                  className={r.met ? "text-green-600" : "text-gray-400"}
                >
                  {r.met ? "✓" : "○"} {r.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        {mode === "signup" && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={
                confirmPassword.length > 0 && !passwordsMatch
                  ? `${inputClassName} border-red-400`
                  : inputClassName
              }
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1.5 text-xs text-red-600">Passwords don&apos;t match.</p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={status === "submitting" || (mode === "signup" && !canSubmitSignup)}
          className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {status === "submitting"
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Sign up"}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
      </form>

      <button type="button" onClick={switchMode} className="mt-6 w-full text-center text-sm font-medium text-brand-600">
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>
    </main>
  );
}
