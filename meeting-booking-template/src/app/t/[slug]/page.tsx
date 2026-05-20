import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/BookingWidget";
import { BookingResultToast } from "@/components/BookingResultToast";
import { CertificateStrip } from "@/components/CertificateStrip";
import { OfficeAddressLink } from "@/components/OfficeAddressLink";
import { SiteHomeHighlight } from "@/components/SiteHomeHighlight";
import { TherapistFaq } from "@/components/TherapistFaq";
import { TherapistOfficeMap } from "@/components/TherapistOfficeMap";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { ReceptionForm } from "@/components/ReceptionForm";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { prisma } from "@/lib/db";
import { footerCompanyFromSettings } from "@/lib/public-footer";
import { therapistPageTitle } from "@/lib/polish-city-seo";
import { buildSiteMetadata } from "@/lib/site-metadata";
import {
  formatTherapistOfficeAddress,
  sitePublicContentFromSettings,
} from "@/lib/site-public-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await prisma.therapistProfile.findUnique({
    where: { slug },
    select: { officeCity: true },
  });
  if (!profile) {
    return buildSiteMetadata();
  }
  return buildSiteMetadata({
    title: therapistPageTitle(profile.officeCity),
  });
}

export default async function TherapistPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const profile = await prisma.therapistProfile.findUnique({
    where: { slug },
    include: {
      tags: { include: { tag: true } },
      sections: { orderBy: { sortOrder: "asc" } },
      testimonials: { orderBy: { sortOrder: "asc" } },
      certificates: { orderBy: { sortOrder: "asc" } },
      meetingTypes: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!profile) notFound();

  const settings =
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({ data: { siteName: "Trzymsię.pl" } }));
  const footerCompany = footerCompanyFromSettings(settings);
  const siteHome = sitePublicContentFromSettings(settings);
  const officeAddress = formatTherapistOfficeAddress(
    profile.officeAddressLine,
    profile.officeCity,
  );

  return (
    <>
      <PublicNav siteName={settings.siteName} />
      <BookingResultToast paid={sp.paid} cancelled={sp.cancelled} />
      <main className="flex-1">
        <section className="w-full border-b border-[#b9e9f5]/50 bg-[#E4F4F8]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:items-start">
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatarUrl ?? "/placeholder-avatar.svg"}
                  alt=""
                  width={140}
                  height={140}
                  className="h-36 w-36 shrink-0 rounded-full object-cover"
                />
                <div>
                  <h1 className="text-3xl font-bold text-[#003C79] md:text-4xl">
                    {profile.displayName}
                  </h1>
                  {profile.title && (
                    <p className="mt-1 text-lg text-slate-600">{profile.title}</p>
                  )}
                  {(profile.officeCity || profile.officeAddressLine) && (
                    <OfficeAddressLink className="mt-3 block rounded-xl border border-[#37B3D6]/30 bg-white/80 px-3 py-2 text-sm text-[#003C79] shadow-sm transition hover:border-[#37B3D6] hover:bg-white">
                      <strong>Gabinet:</strong>{" "}
                      {[profile.officeAddressLine, profile.officeCity]
                        .filter(Boolean)
                        .join(", ")}
                      <span className="ml-1 text-xs font-normal text-[#37B3D6]">
                        (pokaż na mapie)
                      </span>
                    </OfficeAddressLink>
                  )}
                  {profile.taglineQuote && (
                    <p className="mt-4 italic text-slate-600">
                      {profile.taglineQuote}
                    </p>
                  )}
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {profile.tags.map(({ tag }) => (
                      <li
                        key={tag.id}
                        className="rounded-full border border-[#b9e9f5] bg-[#F3FAFC] px-3 py-1 text-sm text-[#1d4e5f]"
                      >
                        {tag.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div>
              {profile.meetingTypes.length > 0 ? (
                <BookingWidget
                  profileId={profile.id}
                  slug={profile.slug}
                  meetingTypes={profile.meetingTypes}
                  therapistTimezone={profile.timezone}
                />
              ) : (
                <p className="text-sm text-slate-600">Brak typów sesji.</p>
              )}
            </div>
          </div>
        </section>

        <SiteHomeHighlight
          stats={siteHome.homeStats}
          mediaLabel={siteHome.mediaPress.label}
          logos={siteHome.mediaPress.logos}
        />

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-6 text-2xl font-bold text-[#003C79]">
            Dlaczego warto?
          </h2>
          <div className="grid gap-8 md:grid-cols-2 md:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.heroImageUrl ?? "/placeholder-why-worth.png"}
              alt=""
              className="order-1 w-full rounded-2xl object-cover shadow-md md:order-2"
            />
            <div className="order-2 md:order-1">
              {profile.bioLeadHtml ? (
                <div
                  className="prose-section mb-8 max-w-3xl text-slate-700"
                  dangerouslySetInnerHTML={{ __html: profile.bioLeadHtml }}
                />
              ) : null}
              <Link
                href="#recepcja"
                className="inline-block rounded-lg border-2 border-[#37B3D6] px-6 py-3 font-medium text-[#37B3D6] hover:bg-[#37B3D6] hover:text-white"
              >
                Umów sesję / Napisz do mnie
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-[#F7F7F7] py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-2xl font-bold text-[#003C79]">Opinie</h2>
            <TestimonialCarousel items={profile.testimonials} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.avatarUrl ?? "/placeholder-avatar.svg"}
              alt=""
              className="w-full max-w-md rounded-2xl object-cover"
            />
            <div className="space-y-8">
              {profile.sections.map((sec) => (
                <div key={sec.id}>
                  <h3 className="mb-2 text-xl font-semibold text-[#003C79]">
                    {sec.heading}
                  </h3>
                  <div
                    className="prose-section text-slate-700"
                    dangerouslySetInnerHTML={{ __html: sec.bodyHtml }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-[#eff1ff] py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-2xl font-bold text-[#003C79]">
              Certyfikaty i uprawnienia
            </h2>
            <CertificateStrip items={profile.certificates} />
          </div>
        </section>

        <TherapistFaq officeAddress={officeAddress} />

        <TherapistOfficeMap
          officeCity={profile.officeCity}
          officeAddressLine={profile.officeAddressLine}
        />

        <section id="recepcja" className="border-t border-[#b9e9f5]/50 bg-[#E4F4F8] py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-2 text-2xl font-bold text-[#003C79]">Recepcja trzymsie.pl</h2>
            <p className="mb-8 text-slate-600">
              Umów się na sesję psychoterapii online lub zadaj nam pytanie dotyczące
              Twojego problemu/najbliższych wolnych terminów/dopasowania dla Ciebie
              odpowiedniego terapeuty lub procesu rezerwacji sesji, a skontaktujemy się z
              Tobą tak szybko, jak będzie to możliwe. Jeśli pragniesz, aby Twoje
              zapytanie zostało przekazane konkretnemu terapeucie, napisz, któremu.
            </p>
            <div className="grid gap-10 md:grid-cols-2">
              <ReceptionForm
                profileId={profile.id}
                introHtml={profile.receptionIntroHtml}
              />
              {profile.meetingTypes.length > 0 ? (
                <BookingWidget
                  profileId={profile.id}
                  slug={profile.slug}
                  meetingTypes={profile.meetingTypes}
                  therapistTimezone={profile.timezone}
                />
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter company={footerCompany} />
    </>
  );
}
