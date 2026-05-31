import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function POST(req: Request) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const body = z
    .object({
      name: z.string().min(1),
      unit: z.string().default("kg"),
      stockQty: z.number().nonnegative().default(0),
      minStockQty: z.number().nonnegative().default(0),
      costGrosze: z.number().int().nonnegative().default(0),
    })
    .parse(await req.json());

  const item = await prisma.inventoryItem.create({
    data: { tenantId: session.tenantId, ...body },
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json(item);
}
