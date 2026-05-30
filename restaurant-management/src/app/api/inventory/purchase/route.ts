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
      inventoryItemId: z.string(),
      quantity: z.number().positive(),
      note: z.string().optional(),
    })
    .parse(await req.json());

  const item = await prisma.inventoryItem.findFirst({
    where: { id: body.inventoryItemId, tenantId: session.tenantId },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: { stockQty: { increment: body.quantity } },
    }),
    prisma.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "purchase",
        quantity: body.quantity,
        note: body.note ?? "Stock purchase",
      },
    }),
  ]);

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
