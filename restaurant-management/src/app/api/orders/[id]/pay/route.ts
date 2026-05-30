import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { taxFromSubtotal } from "@/lib/currency";
import { deductInventoryForOrder, upsertCustomerFromOrder } from "@/lib/inventory";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const order = await prisma.order.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await prisma.restaurantSettings.findUnique({ where: { tenantId: session.tenantId } });
  const taxRateBps = settings?.taxRateBps ?? 800;
  const body = z.object({ tipGrosze: z.number().int().nonnegative(), method: z.string() }).parse(await req.json());

  const subtotal = order.items.reduce((s, i) => s + i.priceGrosze * i.quantity, 0);
  const tax = taxFromSubtotal(subtotal, taxRateBps);
  const total = subtotal + tax + body.tipGrosze;

  await prisma.$transaction([
    prisma.payment.create({
      data: { orderId: id, method: body.method, tipGrosze: body.tipGrosze, totalGrosze: total },
    }),
    prisma.order.update({ where: { id }, data: { status: "PAID" } }),
  ]);

  if (order.source === "QR_MENU" && (order.customerEmail || order.customerPhone)) {
    const customer = await upsertCustomerFromOrder({
      tenantId: session.tenantId,
      name: order.customerName ?? "Guest",
      email: order.customerEmail ?? undefined,
      phone: order.customerPhone ?? undefined,
      orderTotalGrosze: total,
    });
    if (customer) {
      await prisma.order.update({ where: { id }, data: { customerId: customer.id } });
    }
  }

  await deductInventoryForOrder(id);

  if (order.tableNumber && order.locationId) {
    await prisma.table.update({
      where: {
        tenantId_locationId_number: {
          tenantId: session.tenantId,
          locationId: order.locationId,
          number: order.tableNumber,
        },
      },
      data: { status: "AVAILABLE", currentOrderId: null },
    });
  }

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
