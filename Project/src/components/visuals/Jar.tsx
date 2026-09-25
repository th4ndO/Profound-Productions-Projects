import { useId } from "react";

/**
 * Ported 1:1 from reference/groundwork.html's `drawJar(p)`. The prototype
 * mints a unique clipPath id per call via a module-level counter
 * (`uidCounter`) to avoid collisions between multiple jars drawn on one
 * page; React's `useId()` is the idiomatic equivalent for that same
 * per-instance uniqueness requirement.
 */
const JAR_PATH =
  "M60 60 L60 52 Q60 46 66 46 L134 46 Q140 46 140 52 L140 60 Q156 72 156 100 L156 164 Q156 182 138 182 L62 182 Q44 182 44 164 L44 100 Q44 72 60 60Z";

export function Jar({ p }: { p: number }) {
  const clipId = `jar-clip-${useId()}`;
  const fillTop = 182 - p * 134;

  const coins = [];
  outer: for (let r = 0; r < 16; r++) {
    const y = 176 - r * 9;
    if (y - 4 < fillTop) break outer;
    for (let c = 0; c < 6; c++) {
      const x = 52 + c * 19 + (r % 2 ? 9 : 0);
      coins.push(
        <ellipse
          key={`coin-${r}-${c}`}
          cx={x}
          cy={y}
          rx={9}
          ry={4}
          style={{ fill: "var(--coin)", stroke: "var(--coin-bg)" }}
          strokeWidth={1}
        />,
      );
    }
  }

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={JAR_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect
          x={40}
          y={fillTop.toFixed(1)}
          width={120}
          height={(182 - fillTop).toFixed(1)}
          style={{ fill: "var(--coin-bg)" }}
        />
        {coins}
      </g>
      <path d={JAR_PATH} style={{ fill: "none", stroke: "var(--glass)" }} strokeWidth={3} />
      <rect x={54} y={34} width={92} height={13} rx={4} style={{ fill: "var(--bark)" }} />
      {p >= 1 && (
        <path
          d="M84 22 l6 -10 l6 10 M104 22 l6 -10 l6 10"
          style={{ stroke: "var(--fruit)", fill: "none" }}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
    </>
  );
}
