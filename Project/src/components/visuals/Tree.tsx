import { Ground } from "./Ground";

/**
 * Ported 1:1 from reference/groundwork.html's `drawTree(p)`. Coordinate
 * math and constants are unchanged — only the string-building was
 * translated into JSX-producing loops.
 */

// L in the prototype: leaf-cluster offsets/scale, [dx, dy, r].
const LEAF_POSITIONS: Array<[number, number, number]> = [
  [0, 0, 1],
  [-22, 8, 0.8],
  [22, 8, 0.8],
  [-12, -16, 0.85],
  [14, -18, 0.85],
  [-34, -4, 0.65],
  [34, -2, 0.65],
  [0, -30, 0.7],
  [-26, -26, 0.6],
  [26, -28, 0.6],
  [-40, 14, 0.55],
  [40, 16, 0.55],
  [-8, 20, 0.6],
  [10, 22, 0.6],
  [0, -44, 0.5],
  [-18, -40, 0.5],
  [18, -42, 0.5],
];

const FRUIT_POSITIONS: Array<[number, number]> = [
  [-20, 4],
  [18, -10],
  [4, 18],
  [-30, -18],
  [30, 10],
];

export function Tree({ p }: { p: number }) {
  const g = 182;

  if (p < 0.04) {
    return (
      <>
        <Ground />
        <ellipse cx={100} cy={g - 4} rx={7} ry={5} style={{ fill: "var(--bark)" }} />
        <path d={`M100 ${g - 9} q-4 -8 -9 -9 q6 -1 9 7`} style={{ fill: "var(--leaf2)" }} />
      </>
    );
  }

  const h = 18 + 112 * p;
  const top = g - h;
  const w = 3 + 9 * p;

  const nb = Math.floor(p * 6);
  const branches = [];
  for (let i = 0; i < nb; i++) {
    const y = g - h * (0.42 + 0.09 * i);
    const dir = i % 2 ? 1 : -1;
    const len = (20 + p * 22) * (1 - i * 0.1);
    branches.push(
      <path
        key={`branch-${i}`}
        d={`M100 ${y.toFixed(1)} q${(dir * len * 0.5).toFixed(1)} ${(-len * 0.2).toFixed(1)} ${(dir * len).toFixed(1)} ${(-len * 0.55).toFixed(1)}`}
        style={{ stroke: "var(--bark)", fill: "none" }}
        strokeWidth={Math.max(1.5, w * 0.35).toFixed(1)}
        strokeLinecap="round"
      />,
    );
  }

  const nl = Math.max(1, Math.round(p * LEAF_POSITIONS.length));
  const R = 9 + 11 * p;
  const sp = 0.45 + 0.55 * p;
  const leaves = [];
  for (let i = 0; i < nl; i++) {
    const [dx, dy, r] = LEAF_POSITIONS[i];
    leaves.push(
      <circle
        key={`leaf-${i}`}
        cx={(100 + dx * sp * 1.3).toFixed(1)}
        cy={(top + 10 + dy * sp * 1.2).toFixed(1)}
        r={(R * r).toFixed(1)}
        style={{ fill: i % 3 === 0 ? "var(--leaf2)" : "var(--leaf)" }}
      />,
    );
  }

  return (
    <>
      <Ground />
      <path
        d={`M${100 - w} ${g} Q${100 - w * 0.5} ${g - h * 0.5} 100 ${top} Q${100 + w * 0.5} ${g - h * 0.5} ${100 + w} ${g}Z`}
        style={{ fill: "var(--bark)" }}
      />
      {branches}
      {leaves}
      {p >= 1 &&
        FRUIT_POSITIONS.map(([dx, dy], i) => (
          <circle key={`fruit-${i}`} cx={100 + dx} cy={top + 10 + dy} r={4.5} style={{ fill: "var(--fruit)" }} />
        ))}
    </>
  );
}
