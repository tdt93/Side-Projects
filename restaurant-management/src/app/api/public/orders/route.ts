import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { resolveOrderLines } from "@/lib/order-lines";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_QTY_PER_LINE = 20;
const MAX_LINES = 30;

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "public-orders", 10, 60_000);
  if (limited) return limited;

  try {
    const body = z
      .object({
        tenantSlug: z.string().min(1).max(80),
        locationId: z.string().min(1),
        customerName: z.string().min(1).max(120),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().max(40).optional(),
        items: z
          .array(
            z.object({
              menuItemId: z.string(),
              quantity: z.number().int().positive().max(MAX_QTY_PER_LINE),
            }),
          )
          .min(1)
          .max(MAX_LINES),
      })
      .refine((d) => d.customerEmail || d.customerPhone, {
        message: "Email or phone required",
      })
      .parse(await req.json());

    const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } });
    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const location = await prisma.location.findFirst({
      where: { id: body.locationId, tenantId: tenant.id, isActive: true },
    });
    if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });

    let lines: Awaited<ReturnType<typeof resolveOrderLines>>;
    try {
      lines = await resolveOrderLines(tenant.id, body.items, location.id);
    } catch {
      return NextResponse.json({ error: "Invalid menu items" }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        status: "PENDING",
        source: "QR_MENU",
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        items: { create: lines },
      },
    });

    notifyTenantUpdate(tenant.id);

    return NextResponse.json({
      orderId: order.id,
      status: "pending",
      message: "Order received. Pay at the counter or wait for confirmation.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}
