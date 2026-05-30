import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { prisma } from "@/lib/db";
import { footerCompanyFromSettings } from "@/lib/public-footer";
import { reconcileP24BookingPayment } from "@/lib/booking-p24-sync";
import { therapistPublicPath } from "@/lib/therapist-path";

export default async function BookPaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    slug?: string;
    bookingId?: string;
    sessionId?: string;
    orderId?: string;
    amount?: string;
  }>;
}) {
  const sp = await searchParams;
  const slug = sp.slug?.trim();
  const bookingId = sp.bookingId?.trim();
  const sessionId = sp.sessionId?.trim();
  const orderId = parseInt(sp.orderId ?? "", 10);
  const amount = parseInt(sp.amount ?? "", 10);

  const settings =
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({ data: { siteName: "Trzymsię.pl" } }));
  const footerCompany = footerCompanyFromSettings(settings);

  if (!slug) {
    return (
      <>
        <PublicNav siteName={settings.siteName} />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
          <h1 className="text-lg font-semibold text-[#003C79]">Brak danych płatności</h1>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-[#37B3D6] hover:underline">
            Strona główna
          </Link>
        </main>
        <PublicFooter company={footerCompany} />
      </>
    );
  }

  const bid = bookingId ?? sessionId;
  if (bid && orderId && amount > 0) {
    await reconcileP24BookingPayment(bid, orderId, amount);
    redirect(`/book/confirmed?bookingId=${encodeURIComponent(bid)}`);
  }

  if (bid) {
    redirect(`/book/confirmed?bookingId=${encodeURIComponent(bid)}`);
  }

  const profile = await prisma.therapistProfile.findUnique({
    where: { slug },
    select: { officeCity: true },
  });

  return (
    <>
      <PublicNav siteName={settings.siteName} />
      <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-[#003C79]">Trwa potwierdzanie płatności</h1>
        <p className="mt-2 text-sm text-slate-600">
          Jeśli płatność się powiodła, za chwilę otrzymasz e-mail z potwierdzeniem.
        </p>
        <Link
          href={therapistPublicPath({ city: profile?.officeCity })}
          className="mt-6 inline-block text-sm font-medium text-[#37B3D6] hover:underline"
        >
          Wróć do profilu
        </Link>
      </main>
      <PublicFooter company={footerCompany} />
    </>
  );
}
