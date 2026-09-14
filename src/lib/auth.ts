/**
 * Node-only auth helpers: password hashing (bcrypt), session cookie
 * issuance/teardown (via next/headers), and the current-user / role-check
 * helpers used by server actions and route handlers. Kept separate from
 * ./session.ts, which has no Node/Next dependency and is what
 * src/middleware.ts (Edge runtime) imports instead.
 */
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { signSession, verifySession } from "./session";
import type { User } from "@prisma/client";

export const SESSION_COOKIE_NAME = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const ROLES = ["ADMIN", "PRODUCTION", "BUYER"] as const;
export type Role = (typeof ROLES)[number];

/** Thrown by requireUser/requireRole; route handlers translate this into a
 * 401 (not signed in) or 403 (signed in, wrong role) response. Never caught
 * and swallowed — the whole point is that the caller finds out. */
export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set — copy .env.example to .env and set it",
    );
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, role: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSession({ userId, role, exp }, getSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/** Returns the signed-in User row, or null if there is no valid session. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  const payload = await verifySession(token, getSecret());
  if (!payload) {
    return null;
  }
  return prisma.user.findUnique({ where: { id: payload.userId } });
}

/**
 * Require a signed-in user, optionally restricted to a set of roles.
 * Throws AuthError rather than returning null/undefined — callers must
 * translate that into a 401/403, never quietly proceed as if unrestricted.
 */
export async function requireUser(allowedRoles?: readonly Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("UNAUTHENTICATED", "You must be signed in");
  }
  if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
    throw new AuthError(
      "FORBIDDEN",
      `role "${user.role}" is not permitted to perform this action`,
    );
  }
  return user;
}
