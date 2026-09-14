/**
 * IT-06 (§8.2): a PRODUCTION-role user receives 403 on a margin endpoint.
 *
 * Calls the actual GET handler from src/app/api/products/[id]/margin/
 * route.ts — not a re-implementation of its logic — against a real
 * temporary database. next/headers is mocked only to hand back a signed
 * session cookie for whichever user a test wants to act as; the signature
 * itself is verified for real by src/lib/session.ts, and the role check
 * that produces the 403 is the real requireUser()/authErrorResponse() code
 * path from src/lib/auth.ts and src/lib/api-error.ts.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase, type TestDatabase } from "./db-harness";
import type { PrismaClient } from "@prisma/client";

let currentSessionToken: string | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name !== "session" || currentSessionToken === null) {
        return undefined;
      }
      return { name, value: currentSessionToken };
    },
  }),
}));

let testDb: TestDatabase;
let prisma: PrismaClient;
let signSession: typeof import("@/lib/session").signSession;
let GET: typeof import("@/app/api/products/[id]/margin/route").GET;

let productId: string;

const SESSION_SECRET = "integration-test-session-secret";

async function signInAs(userId: string, role: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  currentSessionToken = await signSession({ userId, role, exp }, SESSION_SECRET);
}

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;
  process.env.SESSION_SECRET = SESSION_SECRET;

  const dbModule = await import("@/lib/db");
  const sessionModule = await import("@/lib/session");
  const routeModule = await import("@/app/api/products/[id]/margin/route");
  prisma = dbModule.prisma;
  signSession = sessionModule.signSession;
  GET = routeModule.GET;

  const kg = await prisma.unit.create({ data: { name: "kilogram", symbol: "kg", measureType: "MASS" } });
  const g = await prisma.unit.create({ data: { name: "gram", symbol: "g", measureType: "MASS" } });
  const unit = await prisma.unit.create({ data: { name: "unit", symbol: "unit", measureType: "COUNT" } });
  await prisma.unitConversion.create({ data: { fromUnitId: kg.id, toUnitId: g.id, factor: 1000 } });

  const flour = await prisma.ingredient.create({
    data: { name: "IT06 Flour", purchaseUnitId: kg.id, purchaseQuantity: 1, recipeUnitId: g.id },
  });
  await prisma.ingredientPrice.create({ data: { ingredientId: flour.id, priceCents: 2000 } });

  const recipe = await prisma.recipe.create({
    data: { name: "IT06 Loaf", standardYieldQty: 1, yieldUnitId: unit.id },
  });
  await prisma.recipeLine.create({
    data: { recipeId: recipe.id, ingredientId: flour.id, quantity: 500, unitId: g.id },
  });
  const product = await prisma.product.create({
    data: { recipeId: recipe.id, sellingPriceCents: 2000, minMarginPercent: 30, active: true },
  });
  productId = product.id;

  await prisma.user.create({
    data: { id: "it06-admin", email: "it06-admin@bakery.local", passwordHash: "x", role: "ADMIN" },
  });
  await prisma.user.create({
    data: { id: "it06-buyer", email: "it06-buyer@bakery.local", passwordHash: "x", role: "BUYER" },
  });
  await prisma.user.create({
    data: { id: "it06-production", email: "it06-production@bakery.local", passwordHash: "x", role: "PRODUCTION" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  testDb.cleanup();
});

function requestFor(id: string): Request {
  return new Request(`http://localhost/api/products/${id}/margin`);
}

describe("GET /api/products/:id/margin", () => {
  it("IT-06: a PRODUCTION-role user receives 403", async () => {
    await signInAs("it06-production", "PRODUCTION");

    const response = await GET(requestFor(productId), { params: Promise.resolve({ id: productId }) });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/PRODUCTION/);
  });

  it("an ADMIN user gets a 200 with margin figures", async () => {
    await signInAs("it06-admin", "ADMIN");

    const response = await GET(requestFor(productId), { params: Promise.resolve({ id: productId }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.marginPercent).toBeCloseTo(50, 5); // cost 1000c, price 2000c
  });

  it("a BUYER user gets a 200 with margin figures", async () => {
    await signInAs("it06-buyer", "BUYER");

    const response = await GET(requestFor(productId), { params: Promise.resolve({ id: productId }) });

    expect(response.status).toBe(200);
  });

  it("an unauthenticated request receives 401, not 403", async () => {
    currentSessionToken = null;

    const response = await GET(requestFor(productId), { params: Promise.resolve({ id: productId }) });

    expect(response.status).toBe(401);
  });
});
