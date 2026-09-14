/**
 * Signs and verifies the opaque session cookie value using HMAC-SHA256 via
 * the Web Crypto API (`crypto.subtle`), which is available in both the
 * Node.js runtime and the Edge runtime Next.js middleware runs in. This
 * file is deliberately free of `next/headers`, Prisma, and bcrypt so
 * `src/middleware.ts` (which runs on the Edge) can import it directly —
 * see src/lib/auth.ts for the Node-only session helpers built on top of it.
 *
 * The cookie itself carries no secret data, only `userId`, `role` and an
 * expiry; it is opaque only in the sense that the signature proves the
 * server minted it. There is no server-side session table — a valid
 * signature and an unexpired `exp` is sufficient.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface SessionPayload {
  userId: string;
  role: string;
  exp: number; // unix seconds
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${payloadB64}.${signatureB64}`;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [payloadB64, signatureB64] = parts as [string, string];

  const key = await importKey(secret);
  const expectedSignature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const expectedSignatureB64 = base64UrlEncode(new Uint8Array(expectedSignature));
  if (expectedSignatureB64 !== signatureB64) {
    return null;
  }

  try {
    const json = decoder.decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(json) as Partial<SessionPayload>;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // expired
    }
    return { userId: payload.userId, role: payload.role, exp: payload.exp };
  } catch {
    return null;
  }
}
