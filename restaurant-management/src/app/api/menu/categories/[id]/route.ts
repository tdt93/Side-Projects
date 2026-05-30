import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const body = z
    .object({ name: z.string().min(1).optional(), sortOrder: z.number().int().optional() })
    .parse(await req.json());

  const existing = await prisma.menuCategory.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.menuCategory.update({
    where: { id },
    data: body,
  });

  if (body.name && body.name !== existing.name) {
    await prisma.menuItem.updateMany({
      where: { tenantId: session.tenantId, category: existing.name },
      data: { category: body.name },
    });
  }

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await prisma.menuCategory.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const itemCount = await prisma.menuItem.count({
    where: { tenantId: session.tenantId, category: existing.name },
  });
  if (itemCount > 0) {
    return NextResponse.json({ error: "Category has menu items" }, { status: 400 });
  }

  await prisma.menuCategory.delete({ where: { id } });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
