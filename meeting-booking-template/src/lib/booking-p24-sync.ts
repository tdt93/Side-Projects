import { BookingStatus } from "@/generated/prisma";
import { finalizeBooking } from "@/lib/booking-confirm";
import { prisma } from "@/lib/db";
import { verifyP24Transaction } from "@/lib/p24";

/**
 * Confirms a pending booking when P24 payment succeeded (webhook or return URL).
 */
export async function reconcileP24BookingPayment(
  bookingId: string,
  orderId: number,
  amount: number,
): Promise<boolean> {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return false;

    if (booking.status === BookingStatus.CONFIRMED) return true;
    if (booking.status !== BookingStatus.PENDING_PAYMENT) return false;

    const sessionId = booking.p24SessionId ?? bookingId;
    const ok = await verifyP24Transaction({
      sessionId,
      orderId,
      amount,
    });
    if (!ok) return false;

    await finalizeBooking(bookingId, orderId);
    return true;
  } catch (e) {
    console.error("[reconcileP24BookingPayment]", bookingId, e);
    return false;
  }
}
