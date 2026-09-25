"use client";

import { useEffect } from "react";
import { APP_NAME } from "@/config";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold text-brand-600">Something went wrong</h1>
      <p className="mt-2 text-gray-600">
        Sorry about that — try again, or head back to {APP_NAME}.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-full border border-gray-300 px-6 py-3 font-semibold"
        >
          Try again
        </button>
        <a href="/" className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">
          Home
        </a>
      </div>
    </main>
  );
}
