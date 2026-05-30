import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
