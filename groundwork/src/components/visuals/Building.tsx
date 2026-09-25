import { Ground } from "./Ground";

/**
 * Ported 1:1 from reference/groundwork.html's `drawBuilding(p)`.
 */
export function Building({ p }: { p: number }) {
  const F = 8;
  const fh = 17;
  const base = 182;
  const x = 52;
  const w = 96;

  const built = p * F;
  const full = Math.floor(built);
  const part = built - full;

  const floors = [];
  for (let i = 0; i < full && i < F; i++) {
    const y = base - (i + 1) * fh;
    const windows = [];
    for (let j = 0; j < 4; j++) {
      windows.push(
        <rect
          key={`window-${i}-${j}`}
          x={x + 10 + j * 21}
          y={y + 5}
          width={12}
          height={8}
          rx={1.5}
          style={{ fill: "var(--window)" }}
        />,
      );
    }
    floors.push(
      <rect key={`floor-${i}`} x={x} y={y} width={w} height={fh} style={{ fill: "var(--wall)" }} />,
      ...windows,
    );
  }

  const topY = base - full * fh;
  let partialFloor = null;
  if (full < F && part > 0) {
    const y = base - (full + 1) * fh;
    partialFloor = (
      <>
        <rect
          x={x}
          y={(topY - fh * part).toFixed(1)}
          width={w}
          height={(fh * part).toFixed(1)}
          style={{ fill: "var(--wall)" }}
          opacity={0.55}
        />
        <rect
          x={x + 1}
          y={y + 1}
          width={w - 2}
          height={fh - 2}
          style={{ fill: "none", stroke: "var(--muted)" }}
          strokeDasharray="4 3"
          strokeWidth={1.5}
        />
      </>
    );
  }

  let topDecoration;
  if (p < 1) {
    const cy = Math.min(topY, base) - 4;
    topDecoration = (
      <>
        <path
          d={`M${x + w + 14} ${base} L${x + w + 14} ${cy - 40} M${x + 30} ${cy - 40} L${x + w + 30} ${cy - 40} M${x + 44} ${cy - 40} L${x + 44} ${cy - 14}`}
          style={{ stroke: "var(--fruit)", fill: "none" }}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <rect x={x + 38} y={cy - 14} width={12} height={8} style={{ fill: "var(--fruit)" }} />
      </>
    );
  } else {
    topDecoration = (
      <>
        <path d={`M100 ${topY} L100 ${topY - 26}`} style={{ stroke: "var(--ink)" }} strokeWidth={2.5} />
        <path d={`M100 ${topY - 26} l20 6 l-20 6Z`} style={{ fill: "var(--accent)" }} />
      </>
    );
  }

  return (
    <>
      <Ground />
      {floors}
      {partialFloor}
      {topDecoration}
    </>
  );
}
