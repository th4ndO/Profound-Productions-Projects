/**
 * Ported 1:1 from reference/groundwork.html's `drawMountain(p)`. The
 * prototype re-declares the ground rect inline here (identical numbers to
 * the shared `ground` const used elsewhere) rather than reusing it, so
 * this component does the same rather than importing `Ground`.
 */

// pts in the prototype: the trail's waypoints, base to summit.
const TRAIL_POINTS: Array<[number, number]> = [
  [40, 178],
  [118, 150],
  [70, 120],
  [124, 95],
  [88, 70],
  [100, 36],
];

function formatPoints(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function Mountain({ p }: { p: number }) {
  const segments: number[] = [];
  let total = 0;
  for (let i = 1; i < TRAIL_POINTS.length; i++) {
    const [x1, y1] = TRAIL_POINTS[i - 1];
    const [x2, y2] = TRAIL_POINTS[i];
    const d = Math.hypot(x2 - x1, y2 - y1);
    segments.push(d);
    total += d;
  }

  let remain = p * total;
  const done: Array<[number, number]> = [TRAIL_POINTS[0]];
  let pos: [number, number] = TRAIL_POINTS[0];
  for (let i = 1; i < TRAIL_POINTS.length; i++) {
    const seg = segments[i - 1];
    if (remain >= seg) {
      remain -= seg;
      done.push(TRAIL_POINTS[i]);
      pos = TRAIL_POINTS[i];
    } else {
      const t = remain / seg;
      const [x1, y1] = TRAIL_POINTS[i - 1];
      const [x2, y2] = TRAIL_POINTS[i];
      pos = [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
      done.push(pos);
      break;
    }
  }

  return (
    <>
      <rect x={0} y={182} width={200} height={18} style={{ fill: "var(--ground)" }} />
      <path d="M8 182 L100 30 L192 182Z" style={{ fill: "var(--rock)" }} />
      <path d="M100 30 L81 62 L92 57 L100 66 L108 57 L119 62Z" style={{ fill: "var(--snow)" }} />
      <polyline
        points={formatPoints(TRAIL_POINTS)}
        style={{ fill: "none", stroke: "var(--snow)" }}
        strokeWidth={2.5}
        strokeDasharray="3 5"
        strokeLinecap="round"
        opacity={0.8}
      />
      <polyline
        points={formatPoints(done)}
        style={{ fill: "none", stroke: "var(--accent)" }}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M100 36 L100 14" style={{ stroke: "var(--ink)" }} strokeWidth={2.5} />
      <path
        d="M100 14 l18 5 l-18 5Z"
        style={p >= 1 ? { fill: "var(--fruit)" } : { fill: "none", stroke: "var(--ink)" }}
        strokeWidth={p >= 1 ? undefined : 1.5}
      />
      <circle
        cx={pos[0].toFixed(1)}
        cy={pos[1].toFixed(1)}
        r={6.5}
        style={{ fill: "var(--accent)", stroke: "var(--surface)" }}
        strokeWidth={2.5}
      />
    </>
  );
}
