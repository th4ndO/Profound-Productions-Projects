import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Best-effort, single-instance rate limit. Resets on cold start and isn't
// shared across serverless instances -- fine as a basic abuse guard for an
// MVP at this scale, not a substitute for real distributed rate limiting.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
  let body: { sellerId?: string; eventType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sellerId, eventType } = body;
  if (!sellerId || (eventType !== "profile_view" && eventType !== "whatsapp_click")) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`${ip}:${sellerId}`)) {
    return NextResponse.json({ skipped: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: seller } = await supabase
      .from("sellers")
      .select("owner_id")
      .eq("id", sellerId)
      .maybeSingle();
    if (seller?.owner_id === user.id) {
      return NextResponse.json({ skipped: true });
    }
  }

  await supabase.from("seller_events").insert({ seller_id: sellerId, event_type: eventType });

  return NextResponse.json({ ok: true });
}
