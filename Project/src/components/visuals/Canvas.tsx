/**
 * Creative / fun. A painting on an easel fills in stroke by stroke as p
 * rises (the next stroke draws in partially); at p = 1 it gets a frame.
 */
const STROKES: Array<{ d: string; color: string; w: number }> = [
  { d: "M58 104 Q100 88 142 104", color: "var(--b1)", w: 14 }, // hills
  { d: "M60 118 Q100 110 140 118", color: "var(--leaf)", w: 12 },
  { d: "M122 52 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0", color: "var(--window)", w: 6 }, // sun
  { d: "M62 60 Q80 50 98 60", color: "var(--b3)", w: 6 },
  { d: "M78 118 L78 86", color: "var(--bark)", w: 5 }, // tree trunk
  { d: "M78 80 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0", color: "var(--leaf2)", w: 8 },
  { d: "M108 96 L126 96 L126 118 L108 118 Z", color: "var(--b2)", w: 5 }, // house
  { d: "M105 97 L117 86 L129 97", color: "var(--b4)", w: 5 },
];

export function Canvas({ p }: { p: number }) {
  const exact = p * STROKES.length;
  const full = Math.floor(exact);
  const partial = exact - full;

  return (
    <>
      {/* easel */}
      <path d="M72 136 L56 190 M128 136 L144 190 M100 30 L100 190" style={{ stroke: "var(--bark)" }} strokeWidth={5} strokeLinecap="round" />
      <rect x={46} y={132} width={108} height={8} rx={2} style={{ fill: "var(--bark)" }} />
      {/* canvas */}
      <rect
        x={50}
        y={38}
        width={100}
        height={92}
        style={{ fill: "var(--snow)", stroke: p >= 1 ? "var(--fruit)" : "var(--line)" }}
        strokeWidth={p >= 1 ? 6 : 2}
      />
      {STROKES.map((s, i) => {
        const amount = i < full ? 1 : i === full ? partial : 0;
        if (amount <= 0) return null;
        return (
          <path
            key={i}
            d={s.d}
            pathLength={1}
            strokeDasharray={`${amount} 1`}
            style={{ stroke: s.color, fill: "none" }}
            strokeWidth={s.w}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </>
  );
}
