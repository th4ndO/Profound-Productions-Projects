"use client";

import dynamic from "next/dynamic";

const CursorTrail = dynamic(() => import("@/components/cursor-trail"), {
  ssr: false,
});
const AmbientTrail = dynamic(() => import("@/components/ambient-trail"), {
  ssr: false,
});

export default function AmbientEffects() {
  return (
    <>
      <AmbientTrail />
      <CursorTrail />
    </>
  );
}
