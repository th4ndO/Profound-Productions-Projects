/**
 * Sleep / rest / health. The moon waxes from a thin crescent to full as p
 * rises; stars come out alongside it, and a soft halo marks completion.
 */
const STARS: Array<[number, number]> = [
  [34, 40],
  [168, 34],
  [150, 168],
  [42, 150],
  [178, 110],
  [22, 96],
];

export function Moon({ p }: { p: number }) {
  const cx = 100;
  const cy = 100;
  const r = 58;
  // Lit fraction: a sliver even at p = 0 so the moon reads as a moon.
  const lit = 0.06 + 0.94 * p;
  const rx = r * Math.abs(1 - 2 * lit);
  // Right limb from top to bottom, then back up along the terminator:
  // bulging right (crescent) below half lit, left (gibbous) above.
  const sweep = lit < 0.5 ? 0 : 1;
  const litPath = `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${rx.toFixed(1)} ${r} 0 0 ${sweep} ${cx} ${cy - r}Z`;
  const stars = STARS.slice(0, Math.round(p * STARS.length));

  return (
    <>
      {p >= 1 && <circle cx={cx} cy={cy} r={r + 12} style={{ fill: "var(--window)", opacity: 0.18 }} />}
      <circle cx={cx} cy={cy} r={r} style={{ fill: "var(--soft)", stroke: "var(--rock)" }} strokeWidth={1.5} />
      <path d={litPath} style={{ fill: "var(--window)" }} />
      {p >= 1 && (
        <>
          <circle cx={82} cy={84} r={9} style={{ fill: "var(--fruit)", opacity: 0.35 }} />
          <circle cx={118} cy={112} r={6} style={{ fill: "var(--fruit)", opacity: 0.35 }} />
          <circle cx={96} cy={126} r={4} style={{ fill: "var(--fruit)", opacity: 0.35 }} />
        </>
      )}
      {stars.map(([x, y], i) => (
        <path
          key={i}
          d={`M${x} ${y - 6} L${x + 1.6} ${y - 1.6} L${x + 6} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 6} L${x - 1.6} ${y + 1.6} L${x - 6} ${y} L${x - 1.6} ${y - 1.6}Z`}
          style={{ fill: "var(--window)" }}
        />
      ))}
    </>
  );
}
