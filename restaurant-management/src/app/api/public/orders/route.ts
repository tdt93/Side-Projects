import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { taxFromSubtotal } from "@/lib/currency";
import { deductInventoryForOrder, upsertCustomerFromOrder } from "@/lib/inventory";
import { notifyTenantUpdate } from "@/lib/live-broadcast";

export async function POST(req: Request) {
  const body = z
    .object({
      tenantSlug: z.string(),
      locationId: z.string(),
      customerName: z.string().min(1),
      customerEmail: z.string().email().optional(),
      customerPhone: z.string().optional(),
      items: z
        .array(
          z.object({
            menuItemId: z.string(),
            quantity: z.number().int().positive(),
          }),
        )
        .min(1),
    })
    .refine((d) => d.customerEmail || d.customerPhone, {
      message: "Email or phone required",
    })
    .parse(await req.json());

  const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const location = await prisma.location.findFirst({
    where: { id: body.locationId, tenantId: tenant.id, isActive: true },
  });
  if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });

  const menuItems = await prisma.menuItem.findMany({
    where: {
      tenantId: tenant.id,
      id: { in: body.items.map((i) => i.menuItemId) },
      available: true,
    },
  });

  const lines = body.items.map((line) => {
    const item = menuItems.find((m) => m.id === line.menuItemId);
    if (!item) throw new Error("Invalid menu item");
    return {
      menuItemId: item.id,
      name: item.name,
      quantity: line.quantity,
      priceGrosze: item.priceGrosze,
    };
  });

  const settings = await prisma.restaurantSettings.findUnique({ where: { tenantId: tenant.id } });
  const taxRateBps = settings?.taxRateBps ?? 800;
  const subtotal = lines.reduce((s, i) => s + i.priceGrosze * i.quantity, 0);
  const tax = taxFromSubtotal(subtotal, taxRateBps);
  const total = subtotal + tax;

  const customer = await upsertCustomerFromOrder({
    tenantId: tenant.id,
    name: body.customerName,
    email: body.customerEmail,
    phone: body.customerPhone,
    orderTotalGrosze: total,
  });

  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      locationId: location.id,
      status: "PENDING",
      source: "QR_MENU",
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerId: customer?.id,
      items: { create: lines },
    },
    include: { items: true },
  });

  await prisma.payment.create({
    data: { orderId: order.id, method: "qr", tipGrosze: 0, totalGrosze: total },
  });
  await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
  await deductInventoryForOrder(order.id);

  notifyTenantUpdate(tenant.id);

  return NextResponse.json({ orderId: order.id, totalGrosze: total });
}
