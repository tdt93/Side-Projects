import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { BookingStatus } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { footerCompanyFromSettings } from "@/lib/public-footer";
import { reconcileP24BookingPayment } from "@/lib/booking-p24-sync";
import { therapistPublicPath } from "@/lib/therapist-path";

export default async function BookConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; orderId?: string; amount?: string }>;
}) {
  const sp = await searchParams;
  const bookingId = sp.bookingId?.trim();
  if (!bookingId) notFound();

  const orderId = parseInt(sp.orderId ?? "", 10);
  const amount = parseInt(sp.amount ?? "", 10);
  if (orderId > 0 && amount > 0) {
    await reconcileP24BookingPayment(bookingId, orderId, amount);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { profile: true, meetingType: true },
  });
  if (!booking) notFound();

  const settings =
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({ data: { siteName: "Trzymsię.pl" } }));
  const footerCompany = footerCompanyFromSettings(settings);

  const tz = booking.profile.timezone;
  const startL = formatInTimeZone(booking.start, tz, "PPpp");
  const endL = formatInTimeZone(booking.end, tz, "HH:mm");
  const sessionLabel = booking.meetingType?.label ?? "Sesja";
  const paymentPending = booking.status === BookingStatus.PENDING_PAYMENT;
  const officeLocation = [booking.profile.officeCity, booking.profile.officeAddressLine]
    .filter(Boolean)
    .join(" — ");

  return (
    <>
      <PublicNav siteName={settings.siteName} />
      <main className="flex-1">
        <section className="w-full bg-[#E4F4F8] py-10 md:py-14">
          <div className="mx-auto max-w-lg px-4 text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700"
              aria-hidden
            >
              ✓
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#003C79] md:text-3xl">
              Rezerwacja zapisana
            </h1>
            <p className="mt-3 text-sm text-slate-700 md:text-base">
              {paymentPending
                ? "Czekamy na potwierdzenie płatności. Po zaksięgowaniu wyślemy wiadomość na Twój e-mail."
                : "Dziękujemy. Szczegóły wizyty wysłaliśmy na podany adres e-mail."}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-lg px-4 py-10">
          <div className="rounded-xl border border-[#b9e9f5] bg-white p-6 text-sm text-slate-800 shadow-sm">
            <p>
              <strong className="text-[#003C79]">Terapeuta:</strong>{" "}
              {booking.profile.displayName}
            </p>
            <p className="mt-3">
              <strong className="text-[#003C79]">Sesja:</strong> {sessionLabel}
            </p>
            <p className="mt-3">
              <strong className="text-[#003C79]">Termin:</strong> {startL} – {endL}
            </p>
            {officeLocation ? (
              <p className="mt-3">
                <strong className="text-[#003C79]">Gabinet:</strong> {officeLocation}
              </p>
            ) : null}
            <p className="mt-3">
              <strong className="text-[#003C79]">Imię:</strong> {booking.guestName}
            </p>
            <p className="mt-3">
              <strong className="text-[#003C79]">E-mail:</strong> {booking.guestEmail}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={therapistPublicPath({ city: booking.profile.officeCity })}
              className="inline-flex justify-center rounded-lg bg-[#37B3D6] px-5 py-3 text-sm font-medium text-white hover:brightness-95"
            >
              Wróć do profilu terapeuty
            </Link>
            <Link
              href="/"
              className="inline-flex justify-center rounded-lg border border-[#9fd6e5] bg-white px-5 py-3 text-sm font-medium text-[#003C79] hover:bg-[#F3FAFC]"
            >
              Strona główna
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter company={footerCompany} />
    </>
  );
}
