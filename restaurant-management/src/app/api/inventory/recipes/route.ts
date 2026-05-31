import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function GET() {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const recipes = await prisma.recipeLine.findMany({
    where: { menuItem: { tenantId: session.tenantId } },
    include: {
      menuItem: { select: { id: true, name: true } },
      inventoryItem: { select: { id: true, name: true, unit: true } },
    },
  });

  return NextResponse.json(
    recipes.map((r) => ({
      id: r.id,
      menuItemId: r.menuItemId,
      menuItemName: r.menuItem.name,
      inventoryItemId: r.inventoryItemId,
      inventoryItemName: r.inventoryItem.name,
      unit: r.inventoryItem.unit,
      quantity: r.quantity,
    })),
  );
}

export async function POST(req: Request) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const body = z
    .object({
      menuItemId: z.string(),
      inventoryItemId: z.string(),
      quantity: z.number().positive(),
    })
    .parse(await req.json());

  const menuItem = await prisma.menuItem.findFirst({
    where: { id: body.menuItemId, tenantId: session.tenantId },
  });
  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { id: body.inventoryItemId, tenantId: session.tenantId },
  });
  if (!menuItem || !inventoryItem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recipe = await prisma.recipeLine.upsert({
    where: {
      menuItemId_inventoryItemId: {
        menuItemId: body.menuItemId,
        inventoryItemId: body.inventoryItemId,
      },
    },
    create: body,
    update: { quantity: body.quantity },
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json(recipe);
}

export async function DELETE(req: Request) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const recipe = await prisma.recipeLine.findFirst({
    where: { id, menuItem: { tenantId: session.tenantId } },
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipeLine.delete({ where: { id } });
  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
