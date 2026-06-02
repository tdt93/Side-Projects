import { prisma } from "@/lib/db";
import { resolveLocationScope } from "@/lib/restaurant-data";
import type { StaffRole } from "@/lib/session";

export type AnalyticsRange = "day" | "month" | "year";

export type AnalyticsPayload = {
  range: AnalyticsRange;
  trend: { label: string; revenue: number; orders: number; profit?: number }[];
  topDishes: { name: string; orders: number; revenue: number }[];
  peakHours: { hour: string; orders: number }[];
  peakHoursMonth: string;
  revenueByCategory: { category: string; value: number }[];
  totals: { revenue: number; orders: number; avgOrder: number };
};

function orderRevenue(order: { items: { priceGrosze: number; quantity: number }[]; payment: { totalGrosze: number } | null }) {
  if (order.payment) return order.payment.totalGrosze;
  if (order.items.length === 0) return 0;
  return order.items.reduce((s, i) => s + i.priceGrosze * i.quantity, 0);
}

function startDateForRange(range: AnalyticsRange): Date {
  const now = new Date();
  if (range === "day") {
    const d = new Date(now);
    d.setDate(d.getDate() - 13);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "month") {
    const d = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(now.getFullYear() - 4, 0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketKey(date: Date, range: AnalyticsRange): string {
  if (range === "day") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (range === "month") {
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return String(date.getFullYear());
}

function buildEmptyTrend(range: AnalyticsRange): Map<string, { revenue: number; orders: number }> {
  const map = new Map<string, { revenue: number; orders: number }>();
  const now = new Date();

  if (range === "day") {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      map.set(bucketKey(d, range), { revenue: 0, orders: 0 });
    }
    return map;
  }

  if (range === "month") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(bucketKey(d, range), { revenue: 0, orders: 0 });
    }
    return map;
  }

  for (let y = now.getFullYear() - 4; y <= now.getFullYear(); y++) {
    map.set(String(y), { revenue: 0, orders: 0 });
  }
  return map;
}

const HOUR_LABELS = ["10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm", "7pm", "8pm", "9pm", "10pm"];

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function buildPeakHoursFromOrders(orders: { placedAt: Date }[]) {
  const hourMap = new Map<number, number>();
  for (let h = 10; h <= 22; h++) hourMap.set(h, 0);
  for (const order of orders) {
    const hour = order.placedAt.getHours();
    if (hourMap.has(hour)) hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }
  return HOUR_LABELS.map((label, i) => ({
    hour: label,
    orders: hourMap.get(10 + i) ?? 0,
  }));
}

async function fetchPeakHoursForCurrentMonth(
  tenantId: string,
  viewAll: boolean,
  locationId: string | null,
) {
  const monthStart = startOfCurrentMonth();
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      placedAt: { gte: monthStart },
      ...(viewAll || !locationId ? {} : { locationId }),
    },
    select: { placedAt: true },
  });
  return {
    peakHours: buildPeakHoursFromOrders(orders),
    peakHoursMonth: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}

export async function getAnalytics(
  tenantId: string,
  range: AnalyticsRange,
  scope: { staffRole?: StaffRole; activeLocationId?: string | null } = {},
): Promise<AnalyticsPayload> {
  const { viewAll, locationId } = await resolveLocationScope(tenantId, scope);
  const start = startDateForRange(range);
  const locationFilter = viewAll || !locationId ? {} : { locationId };

  const [orders, peakHoursData] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        placedAt: { gte: start },
        ...locationFilter,
      },
      include: {
        items: true,
        payment: true,
      },
      orderBy: { placedAt: "asc" },
    }),
    fetchPeakHoursForCurrentMonth(tenantId, viewAll, locationId),
  ]);

  const menuItems = await prisma.menuItem.findMany({
    where: { tenantId },
    select: { id: true, category: true },
  });
  const menuCategoryById = new Map(menuItems.map((m) => [m.id, m.category]));

  const trendMap = buildEmptyTrend(range);
  const dishMap = new Map<string, { orders: number; revenue: number }>();
  const categoryMap = new Map<string, number>();

  let totalRevenue = 0;
  let paidOrderCount = 0;

  for (const order of orders) {
    const key = bucketKey(order.placedAt, range);
    const bucket = trendMap.get(key) ?? { revenue: 0, orders: 0 };
    bucket.orders += 1;
    trendMap.set(key, bucket);

    for (const line of order.items) {
      const dish = dishMap.get(line.name) ?? { orders: 0, revenue: 0 };
      dish.orders += line.quantity;
      if (order.payment) {
        dish.revenue += line.priceGrosze * line.quantity;
      }
      dishMap.set(line.name, dish);

      const cat = menuCategoryById.get(line.menuItemId) ?? "Other";
      if (order.payment) {
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + line.priceGrosze * line.quantity);
      }
    }

    if (order.payment) {
      const rev = orderRevenue(order);
      bucket.revenue += rev;
      trendMap.set(key, bucket);
      totalRevenue += rev;
      paidOrderCount += 1;
    }
  }

  const trend = [...trendMap.entries()].map(([label, v]) => ({
    label,
    revenue: v.revenue,
    orders: v.orders,
    profit: Math.round(v.revenue * 0.28),
  }));

  const topDishes = [...dishMap.entries()]
    .map(([name, v]) => ({ name, orders: v.orders, revenue: v.revenue }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8);

  const revenueByCategory = [...categoryMap.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  return {
    range,
    trend,
    topDishes,
    peakHours: peakHoursData.peakHours,
    peakHoursMonth: peakHoursData.peakHoursMonth,
    revenueByCategory,
    totals: {
      revenue: totalRevenue,
      orders: orders.length,
      avgOrder: paidOrderCount ? Math.round(totalRevenue / paidOrderCount) : 0,
    },
  };
}
