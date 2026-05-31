import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;

  const body = z
    .object({
      name: z.string().min(1).optional(),
      unit: z.string().optional(),
      minStockQty: z.number().nonnegative().optional(),
      costGrosze: z.number().int().nonnegative().optional(),
    })
    .parse(await req.json());

  const existing = await prisma.inventoryItem.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.inventoryItem.update({ where: { id }, data: body });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;

  const existing = await prisma.inventoryItem.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.inventoryItem.delete({ where: { id } });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
