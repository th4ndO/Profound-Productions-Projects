import { describe, expect, it } from "vitest";
import { authErrorMessage, credentialsProblem, normaliseEmail } from "./account";

describe("normaliseEmail", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail("  Thendo@Example.COM ")).toBe("thendo@example.com");
  });
});

describe("credentialsProblem", () => {
  it("accepts a normal email and an 8+ character password", () => {
    expect(credentialsProblem("a@b.co", "12345678")).toBeNull();
  });

  it("rejects bad emails", () => {
    expect(credentialsProblem("", "12345678")).toMatch(/email/);
    expect(credentialsProblem("no-at-sign", "12345678")).toMatch(/email/);
    expect(credentialsProblem("a@b", "12345678")).toMatch(/email/);
    expect(credentialsProblem("a b@c.de", "12345678")).toMatch(/email/);
  });

  it("rejects short and over-long passwords", () => {
    expect(credentialsProblem("a@b.co", "1234567")).toMatch(/at least 8/);
    expect(credentialsProblem("a@b.co", "x".repeat(73))).toMatch(/72/);
  });
});

describe("authErrorMessage", () => {
  it("maps known Supabase codes and falls back for unknown ones", () => {
    expect(authErrorMessage("email_exists")).toMatch(/already has an account/);
    expect(authErrorMessage("weak_password")).toMatch(/different one/);
    expect(authErrorMessage("invalid_credentials")).toBe("Wrong email or password.");
    expect(authErrorMessage(undefined)).toMatch(/try again/);
  });
});
