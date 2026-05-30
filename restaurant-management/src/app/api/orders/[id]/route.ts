import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";

const statusMap: Record<string, "PENDING" | "COOKING" | "READY" | "SERVED" | "PAID"> = {
  pending: "PENDING",
  cooking: "COOKING",
  ready: "READY",
  served: "SERVED",
  paid: "PAID",
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  const order = await prisma.order.findFirst({ where: { id, tenantId: session.tenantId }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status) {
    await prisma.order.update({
      where: { id },
      data: { status: statusMap[String(body.status).toLowerCase()] ?? order.status },
    });
  }

  if (body.items) {
    const items = z
      .array(
        z.object({
          menuItemId: z.string(),
          name: z.string(),
          quantity: z.number().int().positive(),
          priceGrosze: z.number().int().nonnegative(),
        }),
      )
      .parse(body.items);

    await prisma.orderLine.deleteMany({ where: { orderId: id } });
    await prisma.orderLine.createMany({
      data: items.map((item) => ({ ...item, orderId: id })),
    });
  }

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ ok: true });
}
