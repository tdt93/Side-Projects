import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { BookingStatus } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/slots";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const meetingTypeId = searchParams.get("meetingTypeId");
  if (!profileId || !meetingTypeId) {
    return NextResponse.json(
      { error: "profileId i meetingTypeId są wymagane" },
      { status: 400 },
    );
  }

  const from = new Date();
  const to = addDays(from, 21);
  const slots = await getAvailableSlots({
    profileId,
    meetingTypeId,
    from,
    to,
  });

  const booked = await prisma.booking.findMany({
    where: {
      profileId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] },
      start: { gte: from, lt: to },
    },
    select: { start: true, end: true },
    orderBy: { start: "asc" },
  });

  return NextResponse.json({
    slots,
    booked: booked.map((b) => ({
      start: b.start.toISOString(),
      end: b.end.toISOString(),
    })),
  });
}
