import { NextResponse } from "next/server";
import { isAuthError, requireStaffSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { resolveLocationScope } from "@/lib/restaurant-data";

const statusMap: Record<string, "AVAILABLE" | "OCCUPIED" | "RESERVED"> = {
  available: "AVAILABLE",
  occupied: "OCCUPIED",
  reserved: "RESERVED",
};

export async function PATCH(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const session = await requireStaffSession();
  if (isAuthError(session)) return session;
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
