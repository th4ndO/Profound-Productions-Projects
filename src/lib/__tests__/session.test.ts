import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "../session";

const secret = "test-secret-value";

describe("signSession / verifySession", () => {
  it("round-trips a valid payload", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSession({ userId: "u1", role: "ADMIN", exp }, secret);
    const payload = await verifySession(token, secret);
    expect(payload).toEqual({ userId: "u1", role: "ADMIN", exp });
  });

  it("rejects a token signed with a different secret", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSession({ userId: "u1", role: "ADMIN", exp }, secret);
    const payload = await verifySession(token, "wrong-secret");
    expect(payload).toBeNull();
  });

  it("rejects a tampered payload even if the signature format is intact", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSession({ userId: "u1", role: "PRODUCTION", exp }, secret);
    const [, signatureB64] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ userId: "u1", role: "ADMIN", exp })).toString("base64url")}.${signatureB64}`;
    const payload = await verifySession(forged, secret);
    expect(payload).toBeNull();
  });

  it("rejects an expired token", async () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const token = await signSession({ userId: "u1", role: "BUYER", exp }, secret);
    const payload = await verifySession(token, secret);
    expect(payload).toBeNull();
  });

  it("rejects a malformed token", async () => {
    expect(await verifySession("not-a-real-token", secret)).toBeNull();
    expect(await verifySession("", secret)).toBeNull();
  });
});
