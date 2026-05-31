import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireStaffSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { resolveOrderLines } from "@/lib/order-lines";
import { resolveLocationScope } from "@/lib/restaurant-data";

const MAX_QTY_PER_LINE = 99;

export async function POST(req: Request) {
  const session = await requireStaffSession();
  if (isAuthError(session)) return session;

  const { locationId } = await resolveLocationScope(session.tenantId, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });

  if (!locationId) {
    return NextResponse.json({ error: "Select a location first" }, { status: 400 });
  }

  const body = z
    .object({
      tableNumber: z.number().int().optional(),
      source: z.enum(["dine-in", "online"]).optional(),
      items: z
        .array(
          z.object({
            menuItemId: z.string(),
            quantity: z.number().int().positive().max(MAX_QTY_PER_LINE),
            notes: z.string().optional(),
          }),
        )
        .optional(),
    })
    .parse(await req.json());

  let lineCreates: Awaited<ReturnType<typeof resolveOrderLines>> = [];
  if (body.items?.length) {
    try {
      lineCreates = await resolveOrderLines(session.tenantId, body.items, locationId);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid items" },
        { status: 400 },
      );
    }
  }

  const order = await prisma.order.create({
    data: {
      tenantId: session.tenantId,
      locationId,
      tableNumber: body.tableNumber ?? null,
      status: "PENDING",
      source: body.source === "online" ? "ONLINE" : "DINE_IN",
      items: lineCreates.length ? { create: lineCreates } : undefined,
    },
  });

  if (body.tableNumber) {
    await prisma.table.update({
      where: {
        tenantId_locationId_number: {
          tenantId: session.tenantId,
          locationId,
          number: body.tableNumber,
        },
      },
      data: { status: "OCCUPIED", currentOrderId: order.id },
    });
  }

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ id: order.id });
}
