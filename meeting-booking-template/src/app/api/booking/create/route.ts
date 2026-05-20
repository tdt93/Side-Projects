import { NextResponse } from "next/server";
import { PaymentPolicy, BookingStatus } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/slots";
import { finalizeBooking } from "@/lib/booking-confirm";
import {
  isP24PaymentRail,
  registerP24Transaction,
  resolveSessionPricePlnGrosze,
} from "@/lib/p24";

const appUrl = () =>
  (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profileId = body?.profileId as string | undefined;
  const meetingTypeId = body?.meetingTypeId as string | undefined;
  const startIso = body?.start as string | undefined;
  const guestName = body?.guestName as string | undefined;
  const guestEmail = body?.guestEmail as string | undefined;
  const notes = body?.notes as string | undefined;
  const consentPrivacyTherapist = body?.consentPrivacyTherapist === true;
  const consentMarketingEmail = body?.consentMarketingEmail === true;
  const paymentRailRaw =
    typeof body?.paymentRail === "string" ? body.paymentRail.trim() : "";

  if (!profileId || !meetingTypeId || !startIso || !guestName || !guestEmail) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Nieprawidłowa data" }, { status: 400 });
  }

  const profile = await prisma.therapistProfile.findUnique({
    where: { id: profileId },
    include: { meetingTypes: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Nie znaleziono profilu" }, { status: 404 });
  }

  const mt = profile.meetingTypes.find((m) => m.id === meetingTypeId);
  if (!mt) {
    return NextResponse.json({ error: "Typ sesji" }, { status: 400 });
  }

  const end = new Date(start.getTime() + mt.durationMinutes * 60 * 1000);

  const open = await getAvailableSlots({
    profileId,
    meetingTypeId,
    from: new Date(start.getTime() - 60 * 1000),
    to: new Date(end.getTime() + 60 * 1000),
  });
  const stillValid = open.some(
    (s) => s.start === start.toISOString() && s.end === end.toISOString(),
  );
  if (!stillValid) {
    return NextResponse.json(
      { error: "Ten termin nie jest już dostępny" },
      { status: 409 },
    );
  }

  const overlap = await prisma.booking.count({
    where: {
      profileId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] },
      start: { lt: end },
      end: { gt: start },
    },
  });
  if (overlap > 0) {
    return NextResponse.json({ error: "Termin zajęty" }, { status: 409 });
  }

  if (profile.paymentPolicy === PaymentPolicy.PAY_LATER_IN_PERSON) {
    const booking = await prisma.booking.create({
      data: {
        profileId,
        meetingTypeId,
        start,
        end,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim().toLowerCase(),
        notes: notes?.trim() || null,
        status: BookingStatus.CONFIRMED,
      },
    });
    await finalizeBooking(booking.id);
    return NextResponse.json({ ok: true, payLater: true, bookingId: booking.id });
  }

  if (!consentPrivacyTherapist) {
    return NextResponse.json(
      { error: "Wymagana jest zgoda na przetwarzanie danych i udostępnienie ich terapeucie." },
      { status: 400 },
    );
  }

  if (!isP24PaymentRail(paymentRailRaw)) {
    return NextResponse.json(
      { error: "Wybierz metodę płatności: Przelewy24 lub przelew bankowy." },
      { status: 400 },
    );
  }
  const paymentRail = paymentRailRaw;

  const amountGrosze = resolveSessionPricePlnGrosze(profile.sessionPricePlnGrosze);
  if (amountGrosze <= 0) {
    return NextResponse.json(
      {
        error:
          "Płatność online nie jest skonfigurowana (ustaw cenę sesji u terapeuty w panelu admina lub P24_DEFAULT_PRICE_PLN_GROSZE w .env).",
      },
      { status: 503 },
    );
  }

  const booking = await prisma.booking.create({
    data: {
      profileId,
      meetingTypeId,
      start,
      end,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      notes: notes?.trim() || null,
      status: BookingStatus.PENDING_PAYMENT,
      consentPrivacyTherapistAt: new Date(),
      consentMarketingEmail,
    },
  });

  const sessionId = booking.id;
  await prisma.booking.update({
    where: { id: booking.id },
    data: { p24SessionId: sessionId },
  });

  const base = appUrl();
  const slug = profile.slug;

  try {
    const { redirectUrl } = await registerP24Transaction({
      sessionId,
      amount: amountGrosze,
      description: `Sesja — ${profile.displayName} (${mt.label})`,
      email: booking.guestEmail,
      clientName: booking.guestName,
      urlReturn: `${base}/book/payment-return?slug=${encodeURIComponent(slug)}&bookingId=${encodeURIComponent(booking.id)}`,
      urlStatus: `${base}/api/webhooks/p24`,
      paymentRail,
    });

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      redirectUrl,
    });
  } catch (err) {
    console.error("[booking/create] P24 register", err);
    await prisma.booking.delete({ where: { id: booking.id } });
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Nie udało się utworzyć płatności Przelewy24.",
      },
      { status: 502 },
    );
  }
}
