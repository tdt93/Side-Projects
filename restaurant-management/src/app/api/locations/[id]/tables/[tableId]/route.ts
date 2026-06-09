import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; tableId: string }> },
) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id, tableId } = await ctx.params;

  const body = z.object({
    number: z.number().int().positive().max(9999).optional(),
    name: z.string().trim().max(120).nullable().optional(),
    seats: z.number().int().positive().max(30).optional(),
  }).parse(await req.json());

  const existing = await prisma.table.findFirst({
    where: { id: tableId, locationId: id, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const table = await prisma.table.update({
    where: { id: tableId },
    data: {
      number: body.number,
      name: body.name === undefined ? undefined : body.name || null,
      seats: body.seats,
    },
    select: { id: true, number: true, name: true, seats: true, status: true },
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json(table);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; tableId: string }> },
) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id, tableId } = await ctx.params;

  const existing = await prisma.table.findFirst({
    where: { id: tableId, locationId: id, tenantId: session.tenantId },
    select: { id: true, currentOrderId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.currentOrderId) {
    return NextResponse.json({ error: "Cannot delete occupied table" }, { status: 400 });
  }

  await prisma.table.delete({ where: { id: tableId } });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
