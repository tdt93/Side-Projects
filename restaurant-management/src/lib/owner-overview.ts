import { prisma } from "@/lib/db";
import { resolveLocationScope } from "@/lib/restaurant-data";
import type { StaffRole } from "@/lib/session";

const LATE_PENDING_MIN = 15;
const LATE_COOKING_MIN = 20;
const UNPAID_AFTER_MIN = 30;

export type OverviewOrderRow = {
  id: string;
  locationId: string | null;
  locationName: string;
  tableNumber: number | null;
  status: string;
  source: string;
  fulfillmentType: string;
  customerName?: string;
  placedAt: string;
  elapsedMinutes: number;
  itemCount: number;
};

export type OverviewTableRow = {
  id: string;
  locationId: string;
  locationName: string;
  number: number;
  name?: string;
  status: string;
  occupiedMinutes?: number;
  serviceRequested: boolean;
  qrActive: boolean;
  guestName?: string;
};

export type OwnerOverviewPayload = {
  todayLabel: string;
  orders: {
    active: number;
    newToday: number;
    late: number;
    cancelled: number;
    newList: OverviewOrderRow[];
    lateList: OverviewOrderRow[];
    cancelledList: OverviewOrderRow[];
  };
  tables: {
    occupied: number;
    available: number;
    total: number;
    servedToday: number;
    serviceRequests: OverviewTableRow[];
    qrActive: OverviewTableRow[];
    longOccupancy: OverviewTableRow[];
  };
  payments: {
    unpaid: number;
    issues: number;
    unpaidList: OverviewOrderRow[];
  };
  kitchen: {
    slow: number;
    avgServeMinutes: number;
    slowList: OverviewOrderRow[];
  };
  revenue: {
    today: number;
    byFulfillment: { type: string; revenue: number; orders: number }[];
  };
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function elapsedMinutes(from: Date) {
  return Math.floor((Date.now() - from.getTime()) / 60_000);
}

function mapOrderRow(
  order: {
    id: string;
    locationId: string | null;
    tableNumber: number | null;
    status: string;
    source: string;
    fulfillmentType: string;
    customerName: string | null;
    placedAt: Date;
    items: { quantity: number }[];
  },
  locationName: string,
): OverviewOrderRow {
  return {
    id: order.id,
    locationId: order.locationId,
    locationName,
    tableNumber: order.tableNumber,
    status: order.status.toLowerCase(),
    source: order.source === "DINE_IN" ? "dine-in" : order.source === "QR_MENU" ? "qr-menu" : "online",
    fulfillmentType: order.fulfillmentType.toLowerCase().replace("_", "-"),
    customerName: order.customerName ?? undefined,
    placedAt: order.placedAt.toISOString(),
    elapsedMinutes: elapsedMinutes(order.placedAt),
    itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
  };
}

export async function getOwnerOverview(
  tenantId: string,
  scope: { staffRole?: StaffRole; activeLocationId?: string | null } = {},
): Promise<OwnerOverviewPayload> {
  const { viewAll, locationId } = await resolveLocationScope(tenantId, scope);
  const todayStart = startOfToday();
  const locationFilter = viewAll || !locationId ? {} : { locationId };

  const locations = await prisma.location.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
  });
  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));

  const [orders, tables, servedTodayCount] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, ...locationFilter },
      include: { items: true, payment: true },
      orderBy: { placedAt: "desc" },
    }),
    prisma.table.findMany({
      where: { tenantId, ...locationFilter },
      orderBy: [{ locationId: "asc" }, { number: "asc" }],
    }),
    prisma.order.count({
      where: {
        tenantId,
        ...locationFilter,
        status: "SERVED",
        servedAt: { gte: todayStart },
      },
    }),
  ]);

  const todayOrders = orders.filter((o) => o.placedAt >= todayStart);
  const activeOrders = orders.filter((o) => !["paid", "served", "cancelled"].includes(o.status.toLowerCase()));

  const newToday = todayOrders.filter((o) => o.status === "PENDING");
  const lateOrders = activeOrders.filter((o) => {
    const mins = elapsedMinutes(o.placedAt);
    if (o.status === "PENDING") return mins >= LATE_PENDING_MIN;
    if (o.status === "COOKING") return mins >= LATE_COOKING_MIN;
    return false;
  });
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED" && o.placedAt >= todayStart);

  const unpaidOrders = orders.filter(
    (o) =>
      !o.payment &&
      ["ready", "served"].includes(o.status.toLowerCase()) &&
      o.placedAt >= todayStart &&
      elapsedMinutes(o.placedAt) >= UNPAID_AFTER_MIN,
  );
  const paymentIssues = orders.filter(
    (o) => !o.payment && ["ready", "served"].includes(o.status.toLowerCase()) && o.placedAt >= todayStart,
  );

  const slowKitchen = activeOrders.filter((o) => {
    const mins = elapsedMinutes(o.placedAt);
    return (o.status === "COOKING" && mins >= LATE_COOKING_MIN) || (o.status === "PENDING" && mins >= LATE_PENDING_MIN);
  });

  const servedWithTime = orders.filter((o) => o.servedAt && o.placedAt >= todayStart);
  const avgServeMinutes = servedWithTime.length
    ? Math.round(
        servedWithTime.reduce((s, o) => s + (o.servedAt!.getTime() - o.placedAt.getTime()) / 60_000, 0) /
          servedWithTime.length,
      )
    : 0;

  const qrActiveTableIds = new Set(
    activeOrders.filter((o) => o.source === "QR_MENU" && o.tableNumber != null).map((o) => `${o.locationId}:${o.tableNumber}`),
  );

  const tableRows: OverviewTableRow[] = tables.map((tb) => {
    const key = `${tb.locationId}:${tb.number}`;
    const activeQr = qrActiveTableIds.has(key);
    const occupiedMinutes = tb.occupiedSince ? elapsedMinutes(tb.occupiedSince) : undefined;
    return {
      id: tb.id,
      locationId: tb.locationId,
      locationName: locationNameById.get(tb.locationId) ?? "",
      number: tb.number,
      name: tb.name ?? undefined,
      status: tb.status.toLowerCase(),
      occupiedMinutes,
      serviceRequested: Boolean(tb.serviceRequestedAt),
      qrActive: activeQr,
      guestName: undefined,
    };
  });

  const todayPaid = todayOrders.filter((o) => o.payment);
  const revenueToday = todayPaid.reduce((s, o) => s + (o.payment?.totalGrosze ?? 0), 0);

  const fulfillmentMap = new Map<string, { revenue: number; orders: number }>();
  for (const type of ["DINE_IN", "DELIVERY", "PICKUP"]) {
    fulfillmentMap.set(type, { revenue: 0, orders: 0 });
  }
  for (const order of todayPaid) {
    const key = order.fulfillmentType;
    const bucket = fulfillmentMap.get(key) ?? { revenue: 0, orders: 0 };
    bucket.revenue += order.payment?.totalGrosze ?? 0;
    bucket.orders += 1;
    fulfillmentMap.set(key, bucket);
  }

  const loc = (id: string | null) => (id ? locationNameById.get(id) ?? "" : "");

  return {
    todayLabel: new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    orders: {
      active: activeOrders.length,
      newToday: newToday.length,
      late: lateOrders.length,
      cancelled: cancelledOrders.length,
      newList: newToday.slice(0, 8).map((o) => mapOrderRow({ ...o, fulfillmentType: o.fulfillmentType }, loc(o.locationId))),
      lateList: lateOrders.slice(0, 8).map((o) => mapOrderRow({ ...o, fulfillmentType: o.fulfillmentType }, loc(o.locationId))),
      cancelledList: cancelledOrders.slice(0, 8).map((o) => mapOrderRow({ ...o, fulfillmentType: o.fulfillmentType }, loc(o.locationId))),
    },
    tables: {
      occupied: tables.filter((t) => t.status === "OCCUPIED").length,
      available: tables.filter((t) => t.status === "AVAILABLE").length,
      total: tables.length,
      servedToday: servedTodayCount,
      serviceRequests: tableRows.filter((t) => t.serviceRequested),
      qrActive: tableRows.filter((t) => t.qrActive),
      longOccupancy: tableRows.filter((t) => (t.occupiedMinutes ?? 0) >= 90),
    },
    payments: {
      unpaid: paymentIssues.length,
      issues: unpaidOrders.length,
      unpaidList: paymentIssues.slice(0, 8).map((o) => mapOrderRow({ ...o, fulfillmentType: o.fulfillmentType }, loc(o.locationId))),
    },
    kitchen: {
      slow: slowKitchen.length,
      avgServeMinutes,
      slowList: slowKitchen.slice(0, 8).map((o) => mapOrderRow({ ...o, fulfillmentType: o.fulfillmentType }, loc(o.locationId))),
    },
    revenue: {
      today: revenueToday,
      byFulfillment: [...fulfillmentMap.entries()].map(([type, v]) => ({
        type: type.toLowerCase().replace("_", "-"),
        revenue: v.revenue,
        orders: v.orders,
      })),
    },
  };
}
