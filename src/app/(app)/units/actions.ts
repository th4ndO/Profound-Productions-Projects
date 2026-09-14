"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export interface FormState {
  error: string | null;
}

const MEASURE_TYPES = ["MASS", "VOLUME", "COUNT"] as const;

export async function createUnitAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "BUYER"]);

  const name = String(formData.get("name") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim();
  const measureType = String(formData.get("measureType") ?? "");

  if (!name || !symbol) {
    return { error: "Name and symbol are required." };
  }
  if (!MEASURE_TYPES.includes(measureType as (typeof MEASURE_TYPES)[number])) {
    return { error: "Measure type must be MASS, VOLUME or COUNT." };
  }

  const existing = await prisma.unit.findUnique({ where: { symbol } });
  if (existing) {
    return { error: `A unit with symbol "${symbol}" already exists.` };
  }

  await prisma.unit.create({ data: { name, symbol, measureType } });
  revalidatePath("/units");
  return { error: null };
}

export async function createConversionAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "BUYER"]);

  const fromUnitId = String(formData.get("fromUnitId") ?? "");
  const toUnitId = String(formData.get("toUnitId") ?? "");
  const factorRaw = String(formData.get("factor") ?? "");
  const factor = Number(factorRaw);

  if (!fromUnitId || !toUnitId) {
    return { error: "Both units are required." };
  }
  if (fromUnitId === toUnitId) {
    return { error: "A unit cannot be converted to itself — that conversion is implicit." };
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    return { error: "Factor must be a positive number." };
  }

  const existing = await prisma.unitConversion.findUnique({
    where: { fromUnitId_toUnitId: { fromUnitId, toUnitId } },
  });
  if (existing) {
    return { error: "A conversion between these units already exists." };
  }

  await prisma.unitConversion.create({ data: { fromUnitId, toUnitId, factor } });
  revalidatePath("/units");
  return { error: null };
}
