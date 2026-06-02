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
      name: z.string().min(1).max(120).optional(),
      address: z.string().max(300).optional(),
      phone: z.string().max(40).optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
      openingHours: z.string().max(2000).optional(),
    })
    .parse(await req.json());

  const existing = await prisma.location.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.location.update({
    where: { id },
    data: body,
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;

  const existing = await prisma.location.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tableCount = await prisma.table.count({ where: { locationId: id } });
  if (tableCount > 0) {
    return NextResponse.json({ error: "Location has tables" }, { status: 400 });
  }

  await prisma.location.delete({ where: { id } });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
