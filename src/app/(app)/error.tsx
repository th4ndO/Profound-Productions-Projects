"use client";

import { useEffect } from "react";

/**
 * Route-group error boundary. Next.js renders this in place of the failing
 * segment for any error thrown while rendering a page or layout under
 * (app) — including an uncaught CostingError from a page that didn't wrap
 * its own costRecipe/scaleRecipe call in a try/catch. Deliberately does NOT
 * swallow the error into a default value; it shows the message and offers
 * a retry, matching "never catch a CostingError and return a default"
 * (§11) at the UI layer too.
 */
export default function AppError({
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
    <div className="mx-auto max-w-xl space-y-4 py-12">
      <div className="alert-error">
        <p className="font-medium">Something went wrong.</p>
        <p className="mt-1">{error.message || "An unexpected error occurred."}</p>
      </div>
      <button type="button" onClick={reset} className="btn-secondary">
        Try again
      </button>
    </div>
  );
}
