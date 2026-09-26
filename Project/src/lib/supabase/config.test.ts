import { afterEach, describe, expect, it, vi } from "vitest";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
] as const;

async function loadConfig() {
  vi.resetModules();
  return import("./config");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supabase config", () => {
  it("falls back to the public literals when the env vars are empty strings", async () => {
    // Production regression: Vercel defined these as "", which `??` kept.
    for (const k of KEYS) vi.stubEnv(k, "");
    const c = await loadConfig();
    expect(c.SUPABASE_URL).toBe(c.MIDDLEWARE_SUPABASE_URL);
    expect(c.SUPABASE_ANON_KEY).toBe(c.MIDDLEWARE_SUPABASE_ANON_KEY);
    expect(c.SUPABASE_URL).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(c.VAPID_PUBLIC_KEY.length).toBeGreaterThan(0);
  });

  it("uses a real env value when one is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    const c = await loadConfig();
    expect(c.SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });
});
