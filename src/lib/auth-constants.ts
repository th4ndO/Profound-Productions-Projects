/**
 * Constants shared between ./auth.ts (Node runtime) and ./middleware.ts
 * (Edge runtime). Split out so the Edge middleware never has to import
 * auth.ts itself, which pulls in Prisma and bcrypt — neither works on the
 * Edge runtime.
 */
export const SESSION_COOKIE_NAME = "session";
