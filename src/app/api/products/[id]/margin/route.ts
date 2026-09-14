/**
 * GET /api/products/:id/margin — margin and food-cost percentage for one
 * product, computed live from the current recipe cost.
 *
 * Restricted to ADMIN and BUYER. A signed-in PRODUCTION-role user gets a
 * 403 (not a redirect — middleware already established they are signed
 * in; this is a role check, not an authentication check) — see IT-06.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-error";
import { costRecipeById } from "@/lib/costing-db";
import { foodCostPercent, marginPercent, CostingError } from "@/costing";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(["ADMIN", "BUYER"]);
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: `product not found: "${id}"` }, { status: 404 });
  }

  try {
    const cost = await costRecipeById(product.recipeId);
    return NextResponse.json({
      productId: product.id,
      unitCostCents: cost.unitCents,
      sellingPriceCents: product.sellingPriceCents,
      marginPercent: marginPercent(cost.unitCents, product.sellingPriceCents),
      foodCostPercent: foodCostPercent(cost.unitCents, product.sellingPriceCents),
      minMarginPercent: product.minMarginPercent,
    });
  } catch (err) {
    if (err instanceof CostingError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
