import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { bookingEmailHtml, sendBookingConfirmation } from "@/lib/email";
import { insertBookingEvent } from "@/lib/calendar/google";
import { BookingStatus } from "@/generated/prisma";

export async function finalizeBooking(
  bookingId: string,
  p24OrderId?: number | null,
) {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { profile: { include: { calendar: true } } },
  });
  if (!existing) return null;

  if (existing.status === BookingStatus.CONFIRMED) {
    return existing;
  }
  if (existing.status !== BookingStatus.PENDING_PAYMENT) {
    return null;
  }

  if (existing.emailSentAt) {
    return existing;
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CONFIRMED,
      p24OrderId: p24OrderId ?? undefined,
    },
    include: { profile: { include: { calendar: true } } },
  });

  let googleEventId: string | null = booking.googleEventId;
  if (
    !googleEventId &&
    booking.profile.calendar?.syncPushEnabled &&
    booking.profile.calendar.refreshTokenEnc
  ) {
    googleEventId = await insertBookingEvent({
      refreshTokenEnc: booking.profile.calendar.refreshTokenEnc,
      calendarId: booking.profile.calendar.calendarId,
      summary: `Sesja — ${booking.guestName}`,
      description: `Email: ${booking.guestEmail}\nRezerwacja: ${booking.id}`,
      start: booking.start,
      end: booking.end,
      attendeeEmail: booking.guestEmail,
    });
    if (googleEventId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { googleEventId },
      });
    }
  }

  const tz = booking.profile.timezone;
  const startL = formatInTimeZone(booking.start, tz, "PPpp");
  const endL = formatInTimeZone(booking.end, tz, "HH:mm");
  const payNote =
    booking.profile.paymentPolicy === "PAY_BEFORE_BOOKING"
      ? "Płatność zaksięgowana online."
      : "Płatność: w gabinecie lub zgodnie z ustaleniami.";

  await sendBookingConfirmation({
    to: booking.guestEmail,
    subject: `Potwierdzenie wizyty — ${booking.profile.displayName}`,
    html: bookingEmailHtml({
      guestName: booking.guestName,
      therapistName: booking.profile.displayName,
      startLocal: startL,
      endLocal: endL,
      city: booking.profile.officeCity,
      address: booking.profile.officeAddressLine,
      payNote,
    }),
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { emailSentAt: new Date() },
  });

  return booking;
}
