import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { BookingCheckoutForm } from "@/components/BookingCheckoutForm";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { PaymentPolicy } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { formatPlnFromGrosze, resolveSessionPricePlnGrosze } from "@/lib/p24";
import { footerCompanyFromSettings } from "@/lib/public-footer";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    profileId?: string;
    meetingTypeId?: string;
    start?: string;
    slug?: string;
  }>;
}) {
  const sp = await searchParams;
  const profileId = sp.profileId?.trim();
  const meetingTypeId = sp.meetingTypeId?.trim();
  const start = sp.start?.trim();
  const slug = sp.slug?.trim();

  if (!profileId || !meetingTypeId || !start || !slug) notFound();
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) notFound();

  const profile = await prisma.therapistProfile.findUnique({
    where: { id: profileId },
    include: { meetingTypes: true },
  });
  if (!profile || profile.slug !== slug) notFound();
  const settings =
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({ data: { siteName: "Trzymsię.pl" } }));
  const footerCompany = footerCompanyFromSettings(settings);

  const meeting = profile.meetingTypes.find((m) => m.id === meetingTypeId);
  if (!meeting) notFound();

  const endDate = new Date(startDate.getTime() + meeting.durationMinutes * 60 * 1000);
  const priceGrosze = resolveSessionPricePlnGrosze(profile.sessionPricePlnGrosze);
  const requiresOnlinePayment =
    profile.paymentPolicy === PaymentPolicy.PAY_BEFORE_BOOKING && priceGrosze > 0;
  const priceText =
    priceGrosze > 0 ? formatPlnFromGrosze(priceGrosze) : "Płatność online (PLN)";
  const sessionSummary = `Sesja: ${meeting.label} (${meeting.durationMinutes} min) • ${priceText}`;
  const officeLocation = [profile.officeCity, profile.officeAddressLine]
    .filter(Boolean)
    .join(" — ");

  return (
    <>
      <PublicNav siteName={settings.siteName} />
      <main className="flex-1">
        <section className="w-full bg-[#E4F4F8] py-10 md:py-14">
          <div className="mx-auto max-w-3xl px-4">
            <Link
              href={`/t/${slug}`}
              className="inline-flex text-sm font-semibold text-[#37B3D6] decoration-[#37B3D6]/40 underline-offset-2 hover:underline"
            >
              ← Wróć do profilu
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#003C79] md:text-4xl">
              Finalizacja rezerwacji
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-700">
              Uzupełnij dane kontaktowe i przejdź do bezpiecznej płatności Przelewy24.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-xl border border-[#b9e9f5] bg-[#F3FAFC] p-5 text-sm text-slate-800 shadow-sm">
            <p>
              <strong className="text-[#003C79]">Terapeuta:</strong> {profile.displayName}
            </p>
            <p className="mt-2">
              <strong className="text-[#003C79]">Typ:</strong> {meeting.label}
            </p>
            <p className="mt-2">
              <strong className="text-[#003C79]">Termin:</strong>{" "}
              {formatInTimeZone(startDate, profile.timezone, "PPpp")} –{" "}
              {formatInTimeZone(endDate, profile.timezone, "HH:mm")}
            </p>
            <p className="mt-2">
              <strong className="text-[#003C79]">Cena:</strong> {priceText}
            </p>
            {officeLocation ? (
              <p className="mt-2">
                <strong className="text-[#003C79]">Gabinet:</strong> {officeLocation}
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <BookingCheckoutForm
              profileId={profileId}
              meetingTypeId={meetingTypeId}
              start={start}
              returnSlug={slug}
              sessionSummary={sessionSummary}
              officeLocation={officeLocation || null}
              requiresOnlinePayment={requiresOnlinePayment}
            />
          </div>
        </section>
      </main>
      <PublicFooter company={footerCompany} />
    </>
  );
}
