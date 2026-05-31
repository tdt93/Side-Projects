import { prisma } from "@/lib/db";

export type OrderLineInput = { menuItemId: string; quantity: number; notes?: string };

export async function resolveOrderLines(tenantId: string, items: OrderLineInput[], locationId?: string | null) {
  if (items.length === 0) return [];

  const menuItems = await prisma.menuItem.findMany({
    where: {
      tenantId,
      id: { in: items.map((i) => i.menuItemId) },
      available: true,
      ...(locationId
        ? { OR: [{ locationId: null }, { locationId }] }
        : {}),
    },
  });

  return items.map((line) => {
    const item = menuItems.find((m) => m.id === line.menuItemId);
    if (!item) throw new Error(`Invalid or unavailable menu item: ${line.menuItemId}`);
    return {
      menuItemId: item.id,
      name: item.name,
      quantity: line.quantity,
      priceGrosze: item.priceGrosze,
      notes: line.notes,
    };
  });
}
