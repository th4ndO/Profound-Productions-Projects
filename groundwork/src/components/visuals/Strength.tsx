import { Ground } from "./Ground";

/**
 * Ported 1:1 from reference/groundwork.html's `drawStrength(p)`.
 */
export function Strength({ p }: { p: number }) {
  const plates = p <= 0 ? 0 : Math.min(4, Math.ceil(p * 4 - 1e-9));
  const up = p >= 1;
  const barY = up ? 36 : 94;

  const plateRects = [];
  for (let i = 0; i < plates; i++) {
    const hh = 40 - i * 4;
    plateRects.push(
      <rect
        key={`plate-l-${i}`}
        x={56 - i * 11}
        y={barY - hh / 2}
        width={8}
        height={hh}
        rx={2}
        style={{ fill: "var(--accent)" }}
      />,
      <rect
        key={`plate-r-${i}`}
        x={136 + i * 11}
        y={barY - hh / 2}
        width={8}
        height={hh}
        rx={2}
        style={{ fill: "var(--accent)" }}
      />,
    );
  }

  return (
    <>
      <Ground />
      <path
        d="M100 130 L84 180 M100 130 L116 180"
        style={{ stroke: "var(--ink)", fill: "none" }}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path d="M100 88 L100 132" style={{ stroke: "var(--ink)" }} strokeWidth={11} strokeLinecap="round" />
      {up ? (
        <path
          d={`M100 90 L74 ${barY} M100 90 L126 ${barY}`}
          style={{ stroke: "var(--ink)", fill: "none" }}
          strokeWidth={6}
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M100 92 L80 114 L74 ${barY} M100 92 L120 114 L126 ${barY}`}
          style={{ stroke: "var(--ink)", fill: "none" }}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle cx={100} cy={up ? 70 : 68} r={11} style={{ fill: "var(--ink)" }} />
      <line
        x1={18}
        y1={barY}
        x2={182}
        y2={barY}
        style={{ stroke: "var(--muted)" }}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {plateRects}
      {up && (
        <path
          d="M40 16 l4 -8 M100 10 l0 -8 M160 16 l-4 -8 M28 36 l-8 0 M172 36 l8 0"
          style={{ stroke: "var(--fruit)" }}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
    </>
  );
}
