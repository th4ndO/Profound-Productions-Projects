/**
 * Ported 1:1 from reference/groundwork.html's `drawShelf(p)`.
 */
const SHELVES = [182, 126, 70];
const BOX_WIDTHS = [12, 9, 14, 10, 13, 8, 11];
const BOX_HEIGHTS = [42, 36, 46, 38, 44, 33, 40];
const BOX_COLOR_VARS = ["--b1", "--b2", "--b3", "--b4"];

export function Shelf({ p }: { p: number }) {
  const n = Math.round(p * 21);
  let k = 0;

  const shelvesJsx = SHELVES.map((y, si) => {
    let x = 36;
    const boxes = [];
    for (let b = 0; b < 7; b++) {
      if (k < n) {
        const isLastPlaced = b === 6 && k === n - 1 && p < 1;
        boxes.push(
          <rect
            key={`box-${si}-${b}`}
            x={x}
            y={y - BOX_HEIGHTS[b]}
            width={BOX_WIDTHS[b]}
            height={BOX_HEIGHTS[b]}
            rx={1.5}
            style={{ fill: `var(${BOX_COLOR_VARS[(b + si) % 4]})` }}
            transform={isLastPlaced ? `rotate(-8 ${x} ${y})` : undefined}
          />,
        );
      }
      x += BOX_WIDTHS[b] + 2;
      k++;
    }
    return (
      <g key={`shelf-${si}`}>
        {boxes}
        <rect x={26} y={y} width={148} height={5} style={{ fill: "var(--bark)" }} />
      </g>
    );
  });

  return (
    <>
      <rect
        x={24}
        y={14}
        width={152}
        height={172}
        rx={6}
        style={{ fill: "none", stroke: "var(--bark)" }}
        strokeWidth={4}
      />
      {shelvesJsx}
    </>
  );
}
