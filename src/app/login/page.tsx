import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-stone-900">
          Recipe Costing &amp; Batch Production Planner
        </h1>
        <p className="mb-6 text-sm text-stone-500">Sign in to continue.</p>

        <Suspense fallback={<div className="card text-sm text-stone-500">Loading...</div>}>
          <LoginForm />
        </Suspense>

        <p className="mt-4 text-xs text-stone-400">
          Seed accounts: admin@bakery.local / production@bakery.local /
          buyer@bakery.local — password Password123! (see README).
        </p>
      </div>
    </div>
  );
}
