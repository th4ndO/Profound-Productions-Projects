"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Wrong email or password.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block font-mono text-xs uppercase tracking-wide text-neutral">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-sm border border-surface-line bg-surface px-4 py-3 text-paper focus:outline-2 focus:outline-accent"
        />
      </div>
      <div>
        <label className="mb-2 block font-mono text-xs uppercase tracking-wide text-neutral">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-sm border border-surface-line bg-surface px-4 py-3 text-paper focus:outline-2 focus:outline-accent"
        />
      </div>
      {error && <p className="font-mono text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-sm bg-accent px-6 py-3 font-mono text-sm uppercase tracking-wider text-canvas disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
