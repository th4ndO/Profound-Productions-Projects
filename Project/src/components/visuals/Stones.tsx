/**
 * Habits / mindset. Stepping stones appear one at a time across a river,
 * zig-zagging from the near bank (bottom) to the far bank (top); stones
 * shrink with distance. At p = 1 the traveller has crossed and the flag
 * on the far bank goes up.
 */
const STONES: Array<[number, number, number]> = [
  // [x, y, scale] — nearest first
  [98, 150, 1],
  [70, 128, 0.88],
  [104, 108, 0.78],
  [76, 90, 0.68],
  [106, 74, 0.6],
  [84, 60, 0.52],
];

function Person({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <circle cx={x} cy={y - 18 * s} r={6 * s} style={{ fill: "var(--wall)" }} />
      <path d={`M${x} ${y - 11 * s} L${x} ${y}`} style={{ stroke: "var(--wall)" }} strokeWidth={7 * s} strokeLinecap="round" />
    </g>
  );
}

export function Stones({ p }: { p: number }) {
  const exact = p * STONES.length;
  const full = Math.floor(exact);
  const partial = exact - full;

  return (
    <>
      {/* far bank (top) and near bank (bottom), river between */}
      <path d="M0 22 L200 22 L200 50 Q150 58 100 50 Q50 42 0 52Z" style={{ fill: "var(--ground)" }} />
      <path d="M0 52 Q50 42 100 50 Q150 58 200 50 L200 168 Q150 160 100 168 Q50 176 0 166Z" style={{ fill: "var(--b1)", opacity: 0.55 }} />
      <path d="M0 166 Q50 176 100 168 Q150 160 200 168 L200 200 L0 200Z" style={{ fill: "var(--ground)" }} />
      <path
        d="M22 92 q8 -4 16 0 t16 0 M140 120 q8 -4 16 0 t16 0 M150 76 q6 -3 12 0 t12 0 M20 138 q8 -4 16 0 t16 0"
        style={{ stroke: "var(--snow)", fill: "none", opacity: 0.7 }}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {STONES.map(([x, y, k], i) => {
        // Placed stones are full size; the next one rises in.
        const s = (i < full ? 1 : i === full ? partial : 0) * k;
        if (s <= 0.05) return null;
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx={17 * s} ry={8 * s} style={{ fill: "var(--rock)" }} />
            <ellipse cx={x - 3 * s} cy={y - 2.5 * s} rx={9 * s} ry={3 * s} style={{ fill: "var(--snow)", opacity: 0.55 }} />
          </g>
        );
      })}
      {/* flag on the far bank */}
      <path d="M150 46 L150 8" style={{ stroke: "var(--bark)" }} strokeWidth={3} strokeLinecap="round" />
      {p >= 1 && <path d="M150 9 L128 16 L150 23Z" style={{ fill: "var(--fruit)" }} />}
      {/* traveller: near bank until the crossing is complete */}
      {p >= 1 ? <Person x={120} y={44} s={0.8} /> : <Person x={96} y={186} s={1} />}
    </>
  );
}
