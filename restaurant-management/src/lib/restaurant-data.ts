import { prisma } from "@/lib/db";
import type { StaffRole } from "@/lib/session";
import { endOfDay, startOfDay } from "@/lib/order-display";
import { effectiveTableStatus, mapReservation } from "@/lib/table-reservations";

function parseJsonArray(value: string) {
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

export type RestaurantDataPayload = Awaited<ReturnType<typeof getRestaurantData>>;

type DataScope = {
  staffRole?: StaffRole;
  activeLocationId?: string | null;
};

export async function resolveLocationScope(tenantId: string, scope: DataScope) {
  const locations = await prisma.location.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const viewAll = scope.staffRole === "OWNER" && !scope.activeLocationId;
  const locationId =
    scope.activeLocationId ?? (locations[0]?.id ?? null);

  return { locations, viewAll, locationId };
}

export async function getRestaurantData(tenantId: string, scope: DataScope = {}) {
  const { locations, viewAll, locationId } = await resolveLocationScope(tenantId, scope);

  const menuWhere = viewAll || !locationId
    ? { tenantId }
    : {
        tenantId,
        OR: [{ locationId: null }, { locationId }],
      };

  const orderWhere = viewAll || !locationId
    ? { tenantId }
    : { tenantId, locationId };

  const tableWhere = viewAll || !locationId
    ? { tenantId }
    : { tenantId, locationId };

  const ownerExtras =
    scope.staffRole === "OWNER"
      ? Promise.all([
          prisma.menuCategory.findMany({
            where: { tenantId },
            orderBy: { sortOrder: "asc" },
          }),
          prisma.customer.findMany({
            where: { tenantId },
            orderBy: { totalSpentGrosze: "desc" },
          }),
          prisma.inventoryItem.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
            include: {
              recipeLines: { select: { menuItemId: true, quantity: true } },
              movements: {
                where: { type: "sale" },
                select: { quantity: true },
              },
            },
          }),
        ])
      : Promise.resolve([[], [], []] as const);

  const reservationWhere = viewAll || !locationId
    ? {
        tenantId,
        startsAt: { lte: endOfDay(new Date()) },
        endsAt: { gte: startOfDay(new Date()) },
      }
    : {
        tenantId,
        locationId,
        startsAt: { lte: endOfDay(new Date()) },
        endsAt: { gte: startOfDay(new Date()) },
      };

  const [tenant, settings, menuItems, orders, tables, reservations, ownerData] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        displayName: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
      },
    }),
    prisma.restaurantSettings.findUnique({ where: { tenantId } }),
    prisma.menuItem.findMany({
      where: menuWhere,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.order.findMany({
      where: orderWhere,
      include: { items: true },
      orderBy: { placedAt: "desc" },
    }),
    prisma.table.findMany({
      where: tableWhere,
      orderBy: [{ locationId: "asc" }, { number: "asc" }],
    }),
    prisma.tableReservation.findMany({
      where: reservationWhere,
      orderBy: { startsAt: "asc" },
    }),
    ownerExtras,
  ]);

  const [categories, customers, inventoryItems] = ownerData;
  const now = new Date();

  return {
    tenant,
    activeLocationId: scope.activeLocationId ?? null,
    viewAllLocations: viewAll,
    settings: settings
      ? {
          currency: settings.currency,
          taxRateBps: settings.taxRateBps,
          enabledLanguages: parseJsonArray(settings.enabledLanguages),
          defaultLocale: settings.defaultLocale,
          themeMode: settings.themeMode,
          menuMode: settings.menuMode as "shared" | "mixed" | "per_location",
          posEnabled: settings.posEnabled,
          posProvider: settings.posProvider,
          posEndpoint: settings.posEndpoint ?? undefined,
        }
      : {
          currency: "PLN",
          taxRateBps: 800,
          enabledLanguages: ["vi", "en", "pl"],
          defaultLocale: "vi",
          themeMode: "light",
          menuMode: "mixed" as const,
        },
    menuItems: menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      priceGrosze: m.priceGrosze,
      description: m.description,
      imageUrl: m.imageUrl ?? undefined,
      imageAspectRatio: m.imageAspectRatio as "1:1" | "3:4",
      available: m.available,
      isCombo: m.isCombo,
      comboItemIds: parseJsonArray(m.comboItemIds),
      locationId: m.locationId ?? undefined,
      isShared: !m.locationId,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      locationId: o.locationId ?? undefined,
      tableNumber: o.tableNumber,
      status: o.status.toLowerCase(),
      source:
        o.source === "DINE_IN" ? "dine-in" : o.source === "QR_MENU" ? "qr-menu" : "online",
      placedAt: o.placedAt.toISOString(),
      customerName: o.customerName ?? undefined,
      customerPhone: o.customerPhone ?? undefined,
      items: o.items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        quantity: i.quantity,
        priceGrosze: i.priceGrosze,
        notes: i.notes ?? undefined,
      })),
    })),
    tables: tables.map((t) => ({
      id: t.id,
      locationId: t.locationId,
      number: t.number,
      seats: t.seats,
      status: effectiveTableStatus(t, reservations, now),
      orderId: t.currentOrderId ?? undefined,
    })),
    reservations: reservations.map(mapReservation),
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      phone: l.phone,
      latitude: l.latitude ?? undefined,
      longitude: l.longitude ?? undefined,
      isActive: l.isActive,
      openingHours: l.openingHours,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      orderCount: c.orderCount,
      totalSpentGrosze: c.totalSpentGrosze,
      updatedAt: c.updatedAt.toISOString(),
    })),
    inventoryItems: inventoryItems.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      stockQty: item.stockQty,
      minStockQty: item.minStockQty,
      costGrosze: item.costGrosze,
      soldQty: item.movements.reduce((s, m) => s + Math.abs(m.quantity), 0),
      recipeCount: item.recipeLines.length,
    })),
  };
}
