import { Ground } from "./Ground";

/**
 * People / relationships. A string of six lanterns: they light up one by
 * one as p rises, and the string glows between the lit ones, drawing the
 * connection. At p = 1 every lantern is lit and the whole string glows.
 */
const COUNT = 6;

// Quadratic string from (18, 46) to (182, 46), sagging to y = 96 mid-way.
function pointOnString(t: number): [number, number] {
  const x0 = 18, y0 = 46, cx = 100, cy = 146, x1 = 182, y1 = 46;
  const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
  const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
  return [x, y];
}

export function Lanterns({ p }: { p: number }) {
  const litCount = Math.round(p * COUNT);
  const positions = Array.from({ length: COUNT }, (_, i) => pointOnString((i + 1) / (COUNT + 1)));

  // Glowing segment from the first to the last lit lantern.
  let glow: string | null = null;
  if (litCount >= 2) {
    const pts = [];
    const tStart = 1 / (COUNT + 1);
    const tEnd = litCount / (COUNT + 1);
    for (let k = 0; k <= 16; k++) {
      const [x, y] = pointOnString(tStart + ((tEnd - tStart) * k) / 16);
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    glow = `M${pts.join(" L")}`;
  }

  return (
    <>
      <Ground />
      <path d="M18 46 Q100 146 182 46" style={{ stroke: "var(--rock)", fill: "none" }} strokeWidth={2} />
      {p >= 1 ? (
        <path d="M18 46 Q100 146 182 46" style={{ stroke: "var(--fruit)", fill: "none" }} strokeWidth={3.5} />
      ) : (
        glow && <path d={glow} style={{ stroke: "var(--fruit)", fill: "none" }} strokeWidth={3.5} strokeLinecap="round" />
      )}
      <rect x={12} y={40} width={8} height={142} rx={2} style={{ fill: "var(--bark)" }} />
      <rect x={180} y={40} width={8} height={142} rx={2} style={{ fill: "var(--bark)" }} />
      {positions.map(([x, y], i) => {
        const on = i < litCount;
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={x} y2={y + 10} style={{ stroke: "var(--rock)" }} strokeWidth={1.5} />
            {on && <circle cx={x} cy={y + 24} r={20} style={{ fill: "var(--window)", opacity: 0.25 }} />}
            <rect x={x - 4} y={y + 9} width={8} height={4} rx={1} style={{ fill: "var(--wall)" }} />
            <rect
              x={x - 9}
              y={y + 13}
              width={18}
              height={22}
              rx={7}
              style={{ fill: on ? "var(--window)" : "var(--soft)", stroke: on ? "var(--fruit)" : "var(--rock)" }}
              strokeWidth={1.5}
            />
            <rect x={x - 4} y={y + 35} width={8} height={3} rx={1} style={{ fill: "var(--wall)" }} />
          </g>
        );
      })}
    </>
  );
}
