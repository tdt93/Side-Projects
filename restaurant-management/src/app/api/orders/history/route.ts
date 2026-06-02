import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireStaffSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { endOfDay, startOfDay, startOfMonth } from "@/lib/order-display";
import { resolveLocationScope } from "@/lib/restaurant-data";

export async function GET(req: Request) {
  const session = await requireStaffSession();
  if (isAuthError(session)) return session;

  const rangeParam = new URL(req.url).searchParams.get("range") ?? "day";
  const range = z.enum(["day", "month"]).parse(rangeParam);
  const { locationId, viewAll } = await resolveLocationScope(session.tenantId, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });

  const now = new Date();
  const start = range === "day" ? startOfDay(now) : startOfMonth(now);
  const end = range === "day" ? endOfDay(now) : now;

  const orders = await prisma.order.findMany({
    where: {
      tenantId: session.tenantId,
      placedAt: { gte: start, lte: end },
      status: { in: ["SERVED", "PAID"] },
      ...(viewAll || !locationId ? {} : { locationId }),
    },
    include: { items: true, payment: true },
    orderBy: { placedAt: "desc" },
  });

  return NextResponse.json({
    range,
    orders: orders.map((o) => ({
      id: o.id,
      tableNumber: o.tableNumber,
      status: o.status.toLowerCase(),
      source: o.source.toLowerCase().replace("_", "-"),
      placedAt: o.placedAt.toISOString(),
      customerName: o.customerName ?? undefined,
      totalGrosze:
        o.payment?.totalGrosze ??
        o.items.reduce((s, i) => s + i.priceGrosze * i.quantity, 0),
      items: o.items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        quantity: i.quantity,
        priceGrosze: i.priceGrosze,
      })),
    })),
  });
}
