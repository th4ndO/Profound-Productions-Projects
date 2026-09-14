/**
 * Prisma client singleton. Next.js hot-reloads server modules in dev, which
 * would otherwise create a fresh PrismaClient (and a fresh SQLite
 * connection) on every edit — stash it on `globalThis` so dev reuses one.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
