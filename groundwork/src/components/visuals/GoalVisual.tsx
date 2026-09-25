import { Tree } from "./Tree";
import { Strength } from "./Strength";
import { Building } from "./Building";
import { Mountain } from "./Mountain";
import { Jar } from "./Jar";
import { Shelf } from "./Shelf";

/**
 * The six goal themes, ported from reference/groundwork.html's `THEMES`.
 */
export type Theme = "tree" | "strength" | "building" | "mountain" | "jar" | "shelf";

export const THEME_NAMES: Record<Theme, string> = {
  tree: "Tree",
  strength: "Strength",
  building: "Tower",
  mountain: "Summit",
  jar: "Jar",
  shelf: "Shelf",
};

export const THEME_HINTS: Record<Theme, string> = {
  tree: "Health, growth",
  strength: "Fitness, training",
  building: "Career, business",
  mountain: "Big challenges",
  jar: "Savings, money",
  shelf: "Learning, study",
};

export const THEMES: Theme[] = ["tree", "strength", "building", "mountain", "jar", "shelf"];

function clamp01(p: number): number {
  return Math.max(0, Math.min(1, p));
}

/**
 * Renders one goal's visual: an SVG on the prototype's `0 0 200 200`
 * viewBox, matching `visual(theme, p, label)` in reference/groundwork.html.
 */
export function GoalVisual({
  theme,
  p,
  label,
}: {
  theme: Theme;
  p: number;
  label?: string;
}) {
  const clamped = clamp01(p);
  const ariaLabel = label ?? `${THEME_NAMES[theme]} visual, ${Math.round(clamped * 100)} percent`;

  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={ariaLabel}>
      {theme === "tree" && <Tree p={clamped} />}
      {theme === "strength" && <Strength p={clamped} />}
      {theme === "building" && <Building p={clamped} />}
      {theme === "mountain" && <Mountain p={clamped} />}
      {theme === "jar" && <Jar p={clamped} />}
      {theme === "shelf" && <Shelf p={clamped} />}
    </svg>
  );
}
