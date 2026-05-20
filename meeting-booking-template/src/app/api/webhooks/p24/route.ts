import { NextResponse } from "next/server";
import { BookingStatus } from "@/generated/prisma";
import { reconcileP24BookingPayment } from "@/lib/booking-p24-sync";
import { getP24Config, signNotification } from "@/lib/p24";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function parseNotificationBody(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (body.trim().startsWith("{")) {
    try {
      const j = JSON.parse(body) as Record<string, unknown>;
      for (const [k, v] of Object.entries(j)) {
        out[k] = String(v ?? "");
      }
      return out;
    } catch {
      // fall through to form parse
    }
  }
  for (const part of body.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const fields = parseNotificationBody(raw);

  const merchantId = parseInt(fields.merchantId ?? "", 10);
  const posId = parseInt(fields.posId ?? "", 10);
  const sessionId = fields.sessionId?.trim();
  const amount = parseInt(fields.amount ?? "", 10);
  const originAmount = parseInt(fields.originAmount ?? fields.amount ?? "", 10);
  const currency = fields.currency?.trim() || "PLN";
  const orderId = parseInt(fields.orderId ?? "", 10);
  const methodId = parseInt(fields.methodId ?? "0", 10);
  const statement = fields.statement ?? "";

  if (!sessionId || !orderId || !amount) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let cfg;
  try {
    cfg = getP24Config();
  } catch {
    return NextResponse.json({ error: "P24 not configured" }, { status: 500 });
  }

  const expectedSign = signNotification({
    merchantId,
    posId,
    sessionId,
    amount,
    originAmount,
    currency,
    orderId,
    methodId,
    statement,
    crc: cfg.crc,
  });

  if (fields.sign !== expectedSign) {
    console.error("[p24 webhook] invalid sign", { sessionId, orderId });
    return NextResponse.json({ error: "Invalid sign" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [{ id: sessionId }, { p24SessionId: sessionId }],
    },
  });

  if (!booking) {
    console.warn("[p24 webhook] booking not found", sessionId);
    return NextResponse.json({ received: true });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { p24OrderId: orderId, p24SessionId: sessionId },
  });

  const ok = await reconcileP24BookingPayment(booking.id, orderId, amount);
  if (!ok && booking.status === BookingStatus.PENDING_PAYMENT) {
    console.warn("[p24 webhook] reconcile failed", booking.id, orderId);
  }

  return NextResponse.json({ received: true });
}
