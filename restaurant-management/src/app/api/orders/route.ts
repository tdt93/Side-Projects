import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { resolveLocationScope } from "@/lib/restaurant-data";
import { getSession } from "@/lib/session";

const lineSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  priceGrosze: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId } = await resolveLocationScope(session.tenantId, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });

  if (!locationId) {
    return NextResponse.json({ error: "Select a location first" }, { status: 400 });
  }

  const body = z
    .object({
      tableNumber: z.number().int().optional(),
      source: z.enum(["dine-in", "online"]).optional(),
      items: z.array(lineSchema).optional(),
    })
    .parse(await req.json());

  const order = await prisma.order.create({
    data: {
      tenantId: session.tenantId,
      locationId,
      tableNumber: body.tableNumber ?? null,
      status: "PENDING",
      source: body.source === "online" ? "ONLINE" : "DINE_IN",
      items: body.items?.length ? { create: body.items } : undefined,
    },
  });

  if (body.tableNumber) {
    await prisma.table.update({
      where: {
        tenantId_locationId_number: {
          tenantId: session.tenantId,
          locationId,
          number: body.tableNumber,
        },
      },
      data: { status: "OCCUPIED", currentOrderId: order.id },
    });
  }

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ id: order.id });
}
