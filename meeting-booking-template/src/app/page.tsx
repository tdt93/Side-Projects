import { Suspense } from "react";
import { CitySearch } from "@/components/CitySearch";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { TherapistCard } from "@/components/TherapistCard";
import { TherapistListPagination } from "@/components/TherapistListPagination";
import { WhyTrzymsieSection } from "@/components/WhyTrzymsieSection";
import { prisma } from "@/lib/db";
import { footerCompanyFromSettings } from "@/lib/public-footer";
import { sitePublicContentFromSettings } from "@/lib/site-public-content";

const PAGE_SIZE = 10;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const city = sp.city?.trim();
  const pageRaw = parseInt(sp.page ?? "1", 10);
  const currentPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const settings =
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({
      data: { siteName: "Trzymsię.pl" },
    }));

  const footerCompany = footerCompanyFromSettings(settings);
  const siteContent = sitePublicContentFromSettings(settings);

  const where = city ? { officeCity: city } : undefined;

  const totalCount = await prisma.therapistProfile.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const therapists = await prisma.therapistProfile.findMany({
    where,
    orderBy: { displayName: "asc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { tags: { include: { tag: true } } },
  });

  return (
    <>
      <PublicNav siteName={settings.siteName} />
      <main className="flex-1">
        <section className="w-full bg-[#E4F4F8] py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <p className="mx-auto mb-3 inline-block rounded-full border border-[#37B3D6]/50 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1d4e5f] shadow-sm">
              Rezerwacje stacjonarne i online
            </p>
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#003C79] md:text-5xl">
              Znajdź terapeutę w swojej okolicy
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-base text-slate-700 md:text-lg">
              Szukaj po mieście gabinetu. Umów wizytę online w kilku krokach.
            </p>
            <div className="mx-auto flex justify-center">
              <Suspense fallback={<div className="h-12 w-full max-w-2xl animate-pulse rounded-lg bg-slate-100" />}>
                <CitySearch initialCity={city} />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="mb-4 text-xl font-semibold text-[#003C79]">
            {city ? `Terapeuci — ${city}` : "Wszyscy terapeuci"}
          </h2>
          {totalCount > 0 && (
            <p className="mb-4 text-sm text-slate-600">
              Strona {safePage} z {totalPages} · {totalCount}{" "}
              {totalCount === 1 ? "terapeuta" : "terapeutów"}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {therapists.map((t) => (
              <TherapistCard
                key={t.id}
                slug={t.slug}
                displayName={t.displayName}
                title={t.title}
                officeCity={t.officeCity}
                taglineQuote={t.taglineQuote}
                avatarUrl={t.avatarUrl}
                tags={t.tags.map((x) => x.tag.label)}
              />
            ))}
          </div>
          {therapists.length === 0 && (
            <p className="text-slate-600">Brak wyników dla wybranego miasta.</p>
          )}
          <TherapistListPagination
            currentPage={safePage}
            totalPages={totalPages}
            city={city}
          />
        </section>

        <WhyTrzymsieSection
          title={siteContent.whyTrzymsie.title}
          benefits={siteContent.whyTrzymsie.benefits}
        />
      </main>
      <PublicFooter company={footerCompany} />
    </>
  );
}
