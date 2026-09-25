"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const BASE_SPEED = 24; // deg/sec, autonomous spin when idle
const MAX_SPEED = 420; // deg/sec, cap for interactive boost
const DECAY = 2.4; // how fast the boost settles back to base

export default function SpinningLogo() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const angleRef = useRef(0);
  const speedRef = useRef(BASE_SPEED);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      speedRef.current += (BASE_SPEED - speedRef.current) * Math.min(DECAY * dt, 1);
      angleRef.current += speedRef.current * dt;

      if (imgRef.current) {
        imgRef.current.style.transform = `rotateY(${angleRef.current}deg)`;
      }

      frameId = requestAnimationFrame(tick);
    };

    // Stop spinning while the tab is backgrounded so the loop doesn't
    // burn CPU/battery when nobody can see it.
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
      } else {
        lastTime = performance.now();
        frameId = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    frameId = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const handlePointerMove = (clientX: number, clientY: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const point = { x: clientX - center.x, y: clientY - center.y };

    const last = lastPointRef.current;
    lastPointRef.current = point;
    if (!last) return;

    // Signed angular delta between the previous and current pointer position
    // relative to center — positive = clockwise motion around the logo.
    const cross = last.x * point.y - last.y * point.x;
    const dot = last.x * point.x + last.y * point.y;
    const angleDelta = Math.atan2(cross, dot) * (180 / Math.PI);

    const boost = angleDelta * 14;
    speedRef.current = Math.max(
      -MAX_SPEED,
      Math.min(MAX_SPEED, speedRef.current + boost),
    );
  };

  const resetPointer = () => {
    lastPointRef.current = null;
  };

  return (
    <div
      ref={wrapperRef}
      className="animate-fade-in relative mx-auto w-full max-w-sm [animation-delay:0.2s] md:max-w-lg [perspective:1200px]"
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseLeave={resetPointer}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (touch) handlePointerMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={resetPointer}
    >
      <div
        aria-hidden="true"
        className="animate-spotlight pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-[radial-gradient(circle,_var(--accent)_0%,_transparent_65%)] opacity-30 blur-2xl"
      />
      <div className="animate-float-logo relative [transform-style:preserve-3d]">
        <Image
          ref={imgRef}
          src="/brand/logo-v2.png"
          alt="Profound Productions"
          width={500}
          height={500}
          className="relative h-auto w-full [transform-style:preserve-3d]"
          priority
        />
      </div>
    </div>
  );
}
