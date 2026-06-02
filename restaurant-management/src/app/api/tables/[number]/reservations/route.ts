import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireStaffSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyTenantUpdate } from "@/lib/live-broadcast";
import { endOfDay, startOfDay } from "@/lib/order-display";
import { resolveLocationScope } from "@/lib/restaurant-data";
import { mapReservation } from "@/lib/table-reservations";

export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const session = await requireStaffSession();
  if (isAuthError(session)) return session;
  const { number } = await ctx.params;
  const tableNumber = parseInt(number, 10);

  const { locationId } = await resolveLocationScope(session.tenantId, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });
  if (!locationId) {
    return NextResponse.json({ error: "Select a location first" }, { status: 400 });
  }

  const dateParam = new URL(req.url).searchParams.get("date");
  const day = dateParam ? new Date(dateParam) : new Date();
  const start = startOfDay(day);
  const end = endOfDay(day);

  const rows = await prisma.tableReservation.findMany({
    where: {
      tenantId: session.tenantId,
      locationId,
      tableNumber,
      startsAt: { lte: end },
      endsAt: { gte: start },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ reservations: rows.map(mapReservation) });
}

export async function POST(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const session = await requireStaffSession();
  if (isAuthError(session)) return session;
  const { number } = await ctx.params;
  const tableNumber = parseInt(number, 10);

  const { locationId } = await resolveLocationScope(session.tenantId, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });
  if (!locationId) {
    return NextResponse.json({ error: "Select a location first" }, { status: 400 });
  }

  const body = z
    .object({
      guestName: z.string().min(1).max(120),
      guestPhone: z.string().max(40).optional(),
      startsAt: z.string().min(1),
      endsAt: z.string().min(1),
      notes: z.string().max(500).optional(),
    })
    .parse(await req.json());

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const overlap = await prisma.tableReservation.findFirst({
    where: {
      tenantId: session.tenantId,
      locationId,
      tableNumber,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (overlap) {
    return NextResponse.json({ error: "Time slot overlaps another reservation" }, { status: 409 });
  }

  const row = await prisma.tableReservation.create({
    data: {
      tenantId: session.tenantId,
      locationId,
      tableNumber,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      startsAt,
      endsAt,
      notes: body.notes,
    },
  });

  notifyTenantUpdate(session.tenantId);
  return NextResponse.json({ reservation: mapReservation(row) });
}
