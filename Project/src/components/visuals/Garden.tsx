import { Ground } from "./Ground";

/**
 * Diet / nutrition. A raised vegetable bed: seeds sprout, grow leaves, and
 * produce appears and ripens as p rises. Every element only grows with p
 * (never shrinks), matching the other visuals' no-punishment rule.
 */
const PLANTS: Array<{ x: number; fruit: "tomato" | "pepper" }> = [
  { x: 48, fruit: "tomato" },
  { x: 74, fruit: "pepper" },
  { x: 100, fruit: "tomato" },
  { x: 126, fruit: "pepper" },
  { x: 152, fruit: "tomato" },
];

export function Garden({ p }: { p: number }) {
  const soilTop = 158;

  const plants = PLANTS.map(({ x, fruit }, i) => {
    // Stagger: plant i starts a little later than plant i-1, all full at p = 1.
    const start = i * 0.08;
    const q = Math.max(0, Math.min(1, (p - start) / (1 - start)));
    if (q <= 0) {
      return <circle key={i} cx={x} cy={soilTop + 6} r={2.5} style={{ fill: "var(--leaf2)" }} />;
    }
    const h = 10 + 62 * q;
    const top = soilTop - h;
    const leafPairs = 1 + Math.floor(q * 3);
    const leaves = [];
    for (let k = 0; k < leafPairs; k++) {
      const y = soilTop - h * (0.3 + 0.22 * k);
      const s = 5 + 5 * q;
      leaves.push(
        <ellipse key={`l${k}a`} cx={x - s} cy={y} rx={s} ry={s * 0.45} transform={`rotate(-25 ${x - s} ${y})`} style={{ fill: k % 2 ? "var(--leaf2)" : "var(--leaf)" }} />,
        <ellipse key={`l${k}b`} cx={x + s} cy={y - 3} rx={s} ry={s * 0.45} transform={`rotate(25 ${x + s} ${y - 3})`} style={{ fill: k % 2 ? "var(--leaf)" : "var(--leaf2)" }} />,
      );
    }
    // Produce appears from q = 0.55 and swells to full size; ripe colour at q = 1.
    const fq = Math.max(0, (q - 0.55) / 0.45);
    const ripe = q >= 1;
    const produce =
      fq > 0 ? (
        fruit === "tomato" ? (
          <circle cx={x + 6} cy={top + h * 0.35} r={3 + 5 * fq} style={{ fill: ripe ? "var(--b2)" : "var(--leaf2)" }} />
        ) : (
          <ellipse cx={x - 6} cy={top + h * 0.4} rx={2.5 + 3 * fq} ry={4 + 6 * fq} style={{ fill: ripe ? "var(--fruit)" : "var(--leaf2)" }} />
        )
      ) : null;
    return (
      <g key={i}>
        <path d={`M${x} ${soilTop} L${x} ${top.toFixed(1)}`} style={{ stroke: "var(--leaf)" }} strokeWidth={2.5} strokeLinecap="round" />
        {leaves}
        {produce}
      </g>
    );
  });

  return (
    <>
      <Ground />
      <rect x={28} y={soilTop} width={144} height={26} rx={4} style={{ fill: "var(--bark)" }} />
      <rect x={28} y={soilTop} width={144} height={5} rx={2} style={{ fill: "var(--ground)", opacity: 0.35 }} />
      {plants}
    </>
  );
}
