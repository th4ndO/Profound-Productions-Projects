import { Tree } from "./Tree";
import { Strength } from "./Strength";
import { Building } from "./Building";
import { Mountain } from "./Mountain";
import { Jar } from "./Jar";
import { Shelf } from "./Shelf";
import { Garden } from "./Garden";
import { Moon } from "./Moon";
import { Lanterns } from "./Lanterns";
import { Stones } from "./Stones";
import { Canvas } from "./Canvas";
import { Balloon } from "./Balloon";

/**
 * Goal themes. The first six are ported from reference/groundwork.html's
 * `THEMES`; garden onwards were added so every idea category has a
 * picture that fits it. Keep in sync with the goals.theme check
 * constraint (see the goal_themes_v2 migration).
 */
export type Theme =
  | "tree"
  | "strength"
  | "building"
  | "mountain"
  | "jar"
  | "shelf"
  | "garden"
  | "moon"
  | "lanterns"
  | "stones"
  | "canvas"
  | "balloon";

export const THEME_NAMES: Record<Theme, string> = {
  tree: "Tree",
  strength: "Strength",
  building: "Tower",
  mountain: "Summit",
  jar: "Jar",
  shelf: "Shelf",
  garden: "Garden",
  moon: "Moon",
  lanterns: "Lanterns",
  stones: "Path",
  canvas: "Canvas",
  balloon: "Balloon",
};

export const THEME_HINTS: Record<Theme, string> = {
  tree: "Health, growth",
  strength: "Fitness, training",
  building: "Career, business",
  mountain: "Big challenges",
  jar: "Savings, money",
  shelf: "Learning, study",
  garden: "Diet, nutrition",
  moon: "Sleep, rest",
  lanterns: "People, relationships",
  stones: "Habits, mindset",
  canvas: "Creative, fun",
  balloon: "Adventure, travel",
};

export const THEMES: Theme[] = [
  "tree",
  "strength",
  "building",
  "mountain",
  "jar",
  "shelf",
  "garden",
  "moon",
  "lanterns",
  "stones",
  "canvas",
  "balloon",
];

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
      {theme === "garden" && <Garden p={clamped} />}
      {theme === "moon" && <Moon p={clamped} />}
      {theme === "lanterns" && <Lanterns p={clamped} />}
      {theme === "stones" && <Stones p={clamped} />}
      {theme === "canvas" && <Canvas p={clamped} />}
      {theme === "balloon" && <Balloon p={clamped} />}
    </svg>
  );
}
