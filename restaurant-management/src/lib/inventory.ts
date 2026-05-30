import { prisma } from "@/lib/db";

/** Deduct inventory when an order is paid, based on recipe lines. */
export async function deductInventoryForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  for (const line of order.items) {
    const recipes = await prisma.recipeLine.findMany({
      where: { menuItemId: line.menuItemId },
    });

    for (const recipe of recipes) {
      const usedQty = recipe.quantity * line.quantity;
      await prisma.inventoryItem.update({
        where: { id: recipe.inventoryItemId },
        data: { stockQty: { decrement: usedQty } },
      });
      await prisma.inventoryMovement.create({
        data: {
          inventoryItemId: recipe.inventoryItemId,
          type: "sale",
          quantity: -usedQty,
          menuItemId: line.menuItemId,
          orderId: order.id,
          note: `${line.name} ×${line.quantity}`,
        },
      });
    }
  }
}

export async function upsertCustomerFromOrder(params: {
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  orderTotalGrosze: number;
}) {
  const { tenantId, name, email, phone, orderTotalGrosze } = params;
  if (!email && !phone) return null;

  const existing = await prisma.customer.findFirst({
    where: {
      tenantId,
      OR: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        orderCount: { increment: 1 },
        totalSpentGrosze: { increment: orderTotalGrosze },
      },
    });
  }

  return prisma.customer.create({
    data: {
      tenantId,
      name,
      email,
      phone,
      orderCount: 1,
      totalSpentGrosze: orderTotalGrosze,
    },
  });
}
