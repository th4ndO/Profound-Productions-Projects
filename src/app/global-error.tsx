"use client";

/**
 * Last-resort boundary for an error thrown by the root layout itself
 * (outside the (app) route group's own error.tsx). Next.js requires this
 * file to render its own <html>/<body> since it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: "3rem 1rem", textAlign: "center", fontFamily: "system-ui" }}>
          <p style={{ fontWeight: 600 }}>Something went wrong.</p>
          <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>{error.message}</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", border: "1px solid #d6d3d1", borderRadius: "0.375rem" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
