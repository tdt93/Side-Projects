import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireStaffSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { resolveOrderLines } from "@/lib/order-lines";

const statusMap: Record<string, "PENDING" | "COOKING" | "READY" | "SERVED"> = {
  pending: "PENDING",
  cooking: "COOKING",
  ready: "READY",
  served: "SERVED",
};

const MAX_QTY_PER_LINE = 99;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireStaffSession();
  if (isAuthError(session)) return session;
  const { id } = await ctx.params;
  const body = await req.json();

  const order = await prisma.order.findFirst({ where: { id, tenantId: session.tenantId }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status) {
    const next = String(body.status).toLowerCase();
    if (next === "paid") {
      return NextResponse.json({ error: "Use the pay endpoint to mark orders as paid" }, { status: 400 });
    }
    const mapped = statusMap[next];
    if (mapped) {
      await prisma.order.update({ where: { id }, data: { status: mapped } });
    }
  }

  if (body.items) {
    const parsed = z
      .array(
        z.object({
          menuItemId: z.string(),
          quantity: z.number().int().positive().max(MAX_QTY_PER_LINE),
          notes: z.string().optional(),
        }),
      )
      .parse(body.items);

    let lines: Awaited<ReturnType<typeof resolveOrderLines>>;
    try {
      lines = await resolveOrderLines(session.tenantId, parsed, order.locationId);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid items" },
        { status: 400 },
      );
    }

    await prisma.orderLine.deleteMany({ where: { orderId: id } });
    await prisma.orderLine.createMany({
      data: lines.map((item) => ({ ...item, orderId: id })),
    });
  }

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
