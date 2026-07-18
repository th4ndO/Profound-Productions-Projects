"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; t: number };

const TRAIL_LIFETIME = 500; // ms a point stays visible
const ACCENT = "222, 192, 146"; // matches --accent, as an rgb triplet

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<Point[]>([]);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMove = (e: MouseEvent) => {
      points.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    };
    window.addEventListener("mousemove", handleMove);

    let frameId: number;
    const tick = () => {
      const now = performance.now();
      points.current = points.current.filter((p) => now - p.t < TRAIL_LIFETIME);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pts = points.current;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const age = now - b.t;
        const life = 1 - age / TRAIL_LIFETIME;
        if (life <= 0) continue;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${ACCENT}, ${life * 0.8})`;
        ctx.lineWidth = 2 * life + 0.5;
        ctx.lineCap = "round";
        ctx.shadowColor = `rgba(${ACCENT}, ${life})`;
        ctx.shadowBlur = 12 * life;
        ctx.stroke();
      }

      frameId = requestAnimationFrame(tick);
    };

    // Stop drawing while the tab is backgrounded so the loop doesn't
    // burn CPU/battery when nobody can see it.
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60] hidden md:block"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden="true"
    />
  );
}
