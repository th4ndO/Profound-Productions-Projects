"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function acknowledgeAlertAction(alertId: string): Promise<void> {
  await requireUser(["ADMIN", "BUYER"]);
  await prisma.marginAlert.update({ where: { id: alertId }, data: { acknowledged: true } });
  revalidatePath("/alerts");
}
