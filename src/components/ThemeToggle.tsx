"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

/**
 * Manual override for the three-way theming (system / light / dark) so the
 * token wiring can be checked without changing OS settings. Purely a
 * verification aid for Phase 1 — state is in-memory only (resets to
 * "system" on reload), so there's no localStorage read to cause a
 * server/client hydration mismatch on first render.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");

  // Synchronize the DOM attribute (an external system) with React state.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return (
    <div className={className} role="group" aria-label="Theme">
      {(["system", "light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => setTheme(option)}
        >
          {option[0].toUpperCase() + option.slice(1)}
        </button>
      ))}
    </div>
  );
}
