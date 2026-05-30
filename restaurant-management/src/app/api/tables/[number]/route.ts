import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { resolveLocationScope } from "@/lib/restaurant-data";
import { getSession } from "@/lib/session";

const statusMap: Record<string, "AVAILABLE" | "OCCUPIED" | "RESERVED"> = {
  available: "AVAILABLE",
  occupied: "OCCUPIED",
  reserved: "RESERVED",
};

export async function PATCH(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { number } = await ctx.params;
  const tableNumber = parseInt(number, 10);
  const body = await req.json();

  const { locationId } = await resolveLocationScope(session.tenantId, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });

  if (!locationId) {
    return NextResponse.json({ error: "Select a location first" }, { status: 400 });
  }

  await prisma.table.update({
    where: {
      tenantId_locationId_number: {
        tenantId: session.tenantId,
        locationId,
        number: tableNumber,
      },
    },
    data: {
      status: body.status ? statusMap[String(body.status).toLowerCase()] : undefined,
      currentOrderId: body.orderId === undefined ? undefined : body.orderId,
    },
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
