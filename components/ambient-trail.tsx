"use client";

import { useEffect, useRef } from "react";

type Seg = { from: { x: number; y: number }; to: { x: number; y: number }; draw: boolean };
type Point = { x: number; y: number; t: number };

const TRAIL_LIFETIME = 900; // ms a wander point stays visible
const WORD_HOLD = 1100; // ms the finished word stays fully visible
const WORD_FADE = 700; // ms the finished word takes to fade out
const ACCENT = "222, 192, 146"; // matches --accent
const WANDER_SPEED = 0.26; // px per ms
const WORD_SPEED = 0.13; // px per ms — slower while spelling, for legibility
const SPELL_CHANCE = 0.3; // chance to head for the spot and spell after a wander finishes
const SPOT_ID = "mafela-spot";

function arc(cx: number, cy: number, rx: number, ry: number, startDeg: number, endDeg: number, steps: number): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = startDeg + ((endDeg - startDeg) * i) / steps;
    const rad = (deg * Math.PI) / 180;
    pts.push([cx + Math.cos(rad) * rx, cy + Math.sin(rad) * ry]);
  }
  return pts;
}

// Clean, rounded single-stroke letterforms on a 0..1 box per letter.
// First point of a stroke is a pen-up move, the rest are pen-down draws.
const LETTERS: Record<string, number[][][]> = {
  M: [[[0.02, 1], [0.02, 0], [0.5, 0.65], [0.98, 0], [0.98, 1]]],
  a: [
    [...arc(0.48, 0.62, 0.38, 0.34, -20, 340, 16)],
    [[0.86, 0.1], [0.86, 1]],
  ],
  f: [
    [[0.78, 0.08], ...arc(0.58, 0.18, 0.2, 0.18, -10, -170, 10), [0.38, 0.32], [0.38, 1]],
    [[0.14, 0.4], [0.66, 0.4]],
  ],
  e: [
    [[0.1, 0.55], ...arc(0.48, 0.62, 0.38, 0.34, 180, 530, 18)],
    [[0.1, 0.5], [0.86, 0.5]],
  ],
  l: [[[0.5, 0], [0.5, 1]]],
};

function letterSegments(letter: string, originX: number, originY: number, size: number): Seg[] {
  const strokes = LETTERS[letter];
  if (!strokes) return [];
  const segs: Seg[] = [];
  for (const stroke of strokes) {
    let prev: { x: number; y: number } | null = null;
    for (const [nx, ny] of stroke) {
      const point = { x: originX + nx * size, y: originY + ny * size };
      if (prev) segs.push({ from: prev, to: point, draw: true });
      else segs.push({ from: point, to: point, draw: false });
      prev = point;
    }
  }
  return segs;
}

function wordSegments(word: string, centerX: number, centerY: number, boxWidth: number, boxHeight: number): Seg[] {
  const size = Math.min(boxWidth / (word.length + 1), boxHeight * 0.85);
  const gap = size * 0.3;
  const totalWidth = word.length * size + (word.length - 1) * gap;
  let x = centerX - totalWidth / 2;
  const y = centerY - size / 2;
  const segs: Seg[] = [];
  for (const char of word) {
    segs.push(...letterSegments(char, x, y, size));
    x += size + gap;
  }
  return segs;
}

function randomWalkSegments(start: { x: number; y: number }, steps: number, bounds: { w: number; h: number }): Seg[] {
  const segs: Seg[] = [];
  let pos = start;
  let angle = Math.random() * Math.PI * 2;
  const margin = 40;
  for (let i = 0; i < steps; i++) {
    angle += (Math.random() - 0.5) * 1.4;
    const len = 40 + Math.random() * 70;
    let next = { x: pos.x + Math.cos(angle) * len, y: pos.y + Math.sin(angle) * len };
    if (next.x < margin || next.x > bounds.w - margin) angle = Math.PI - angle;
    if (next.y < margin || next.y > bounds.h - margin) angle = -angle;
    next = {
      x: Math.min(Math.max(next.x, margin), bounds.w - margin),
      y: Math.min(Math.max(next.y, margin), bounds.h - margin),
    };
    segs.push({ from: pos, to: next, draw: i > 0 });
    pos = next;
  }
  return segs;
}

function jumpTo(from: { x: number; y: number }, to: { x: number; y: number }): Seg {
  return { from, to, draw: false };
}

export default function AmbientTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailPoints = useRef<Point[]>([]);
  const wordPoints = useRef<Point[]>([]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let mode: "wander" | "word" = "wander";
    let queue: Seg[] = randomWalkSegments({ x: width / 2, y: height / 2 }, 10, { w: width, h: height });
    let segIndex = 0;
    let segStart = performance.now();
    let pos = { x: width / 2, y: height / 2 };
    let justSpelled = false;
    let wordDoneAt: number | null = null;

    function getSpotRect() {
      const el = document.getElementById(SPOT_ID);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return rect;
    }

    function refillIfNeeded(now: number) {
      if (segIndex < queue.length) return;

      if (mode === "word") {
        if (wordDoneAt === null) wordDoneAt = now;
        if (now - wordDoneAt < WORD_HOLD + WORD_FADE) return;
        wordPoints.current = [];
        wordDoneAt = null;
        mode = "wander";
        justSpelled = true;
        queue = randomWalkSegments(pos, 8 + Math.floor(Math.random() * 8), { w: width, h: height });
        segIndex = 0;
        return;
      }

      segIndex = 0;
      const spot = !justSpelled && Math.random() < SPELL_CHANCE ? getSpotRect() : null;
      if (spot) {
        const centerX = spot.left + spot.width / 2;
        const centerY = spot.top + spot.height / 2;
        const word = wordSegments("Mafela", centerX, centerY, spot.width, spot.height);
        queue = [jumpTo(pos, word[0]?.from ?? pos), ...word];
        mode = "word";
      } else {
        queue = randomWalkSegments(pos, 8 + Math.floor(Math.random() * 8), { w: width, h: height });
        justSpelled = false;
      }
    }

    let frameId: number;
    const tick = (now: number) => {
      refillIfNeeded(now);
      const seg = queue[segIndex];
      const speed = mode === "word" ? WORD_SPEED : WANDER_SPEED;

      if (seg) {
        if (!seg.draw) {
          pos = seg.to;
          (mode === "word" ? wordPoints : trailPoints).current.push({ x: pos.x, y: pos.y, t: now });
          segIndex++;
          segStart = now;
        } else {
          const dist = Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y);
          const duration = Math.max(dist / speed, 16);
          const progress = Math.min((now - segStart) / duration, 1);
          pos = {
            x: seg.from.x + (seg.to.x - seg.from.x) * progress,
            y: seg.from.y + (seg.to.y - seg.from.y) * progress,
          };
          (mode === "word" ? wordPoints : trailPoints).current.push({ x: pos.x, y: pos.y, t: now });
          if (progress >= 1) {
            segIndex++;
            segStart = now;
          }
        }
      }

      trailPoints.current = trailPoints.current.filter((p) => now - p.t < TRAIL_LIFETIME);
      ctx.clearRect(0, 0, width, height);

      drawStrokes(ctx, trailPoints.current, now, TRAIL_LIFETIME, 0.6, 2, 14);

      if (wordPoints.current.length > 1) {
        let life = 1;
        if (wordDoneAt !== null) {
          const sinceDone = now - wordDoneAt;
          if (sinceDone > WORD_HOLD) {
            life = Math.max(0, 1 - (sinceDone - WORD_HOLD) / WORD_FADE);
          }
        }
        drawWordStrokes(ctx, wordPoints.current, life);
      }

      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[55] block md:hidden"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden="true"
    />
  );
}

function drawStrokes(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  now: number,
  lifetime: number,
  maxAlpha: number,
  baseWidth: number,
  maxBlur: number,
) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const age = now - b.t;
    const life = 1 - age / lifetime;
    if (life <= 0) continue;
    if (Math.hypot(b.x - a.x, b.y - a.y) > 150) continue;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(${ACCENT}, ${life * maxAlpha})`;
    ctx.lineWidth = baseWidth * life + 0.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = `rgba(${ACCENT}, ${life})`;
    ctx.shadowBlur = maxBlur * life;
    ctx.stroke();
  }
}

function drawWordStrokes(ctx: CanvasRenderingContext2D, pts: Point[], life: number) {
  if (life <= 0) return;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (Math.hypot(b.x - a.x, b.y - a.y) > 150) continue;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(${ACCENT}, ${life * 0.95})`;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = `rgba(${ACCENT}, ${life})`;
    ctx.shadowBlur = 8;
    ctx.stroke();
  }
}
