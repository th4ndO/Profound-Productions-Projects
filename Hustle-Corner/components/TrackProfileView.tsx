"use client";

import { useEffect } from "react";

export default function TrackProfileView({ sellerId }: { sellerId: string }) {
  useEffect(() => {
    const key = `viewed:${sellerId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (private browsing etc) -- fine to skip
      // dedup and just not log rather than throw.
      return;
    }

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, eventType: "profile_view" }),
      keepalive: true,
    }).catch(() => {});
  }, [sellerId]);

  return null;
}
