import { useId } from "react";
import { Ground } from "./Ground";

/**
 * Adventure / travel. A hot-air balloon lifts off and rises past the
 * clouds as p grows; the sun comes out at p = 1. Like Jar, it needs a
 * per-instance clipPath id for the envelope stripes (useId).
 */
export function Balloon({ p }: { p: number }) {
  const clipId = `balloon-clip-${useId()}`;
  const basketTop = 166 - 88 * p;
  const cx = 100;
  const cy = basketTop - 44;
  const r = 32;
  const envelope = `M${cx} ${cy + r + 8} Q${cx - r - 6} ${cy + 10} ${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Q${cx + r + 6} ${cy + 10} ${cx} ${cy + r + 8}Z`;
  const stripes = [-24, -8, 8, 24];

  return (
    <>
      {p >= 1 && <circle cx={34} cy={34} r={16} style={{ fill: "var(--window)" }} />}
      <ellipse cx={40} cy={100} rx={22} ry={8} style={{ fill: "var(--soft)" }} />
      <ellipse cx={160} cy={64} rx={20} ry={7} style={{ fill: "var(--soft)" }} />
      <ellipse cx={156} cy={138} rx={18} ry={6} style={{ fill: "var(--soft)" }} />
      <Ground />
      <defs>
        <clipPath id={clipId}>
          <path d={envelope} />
        </clipPath>
      </defs>
      <path d={envelope} style={{ fill: "var(--b2)" }} />
      <g clipPath={`url(#${clipId})`}>
        {stripes.map((dx, i) => (
          <rect key={i} x={cx + dx - 4} y={cy - r} width={8} height={2 * r + 10} style={{ fill: "var(--b4)" }} />
        ))}
      </g>
      <path d={envelope} style={{ fill: "none", stroke: "var(--wall)" }} strokeWidth={1.5} />
      <path
        d={`M${cx - 8} ${cy + r + 4} L${cx - 9} ${basketTop} M${cx + 8} ${cy + r + 4} L${cx + 9} ${basketTop}`}
        style={{ stroke: "var(--wall)" }}
        strokeWidth={1.5}
      />
      <rect x={cx - 11} y={basketTop} width={22} height={14} rx={2} style={{ fill: "var(--bark)" }} />
    </>
  );
}
