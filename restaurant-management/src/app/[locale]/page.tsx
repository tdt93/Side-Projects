import { ChefHat, CreditCard, LayoutDashboard, Sparkles } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const year = new Date().getFullYear();

  const features = [
    { icon: ChefHat, title: t("featureKitchen"), desc: t("featureKitchenDesc") },
    { icon: CreditCard, title: t("featureCashier"), desc: t("featureCashierDesc") },
    { icon: LayoutDashboard, title: t("featureOwner"), desc: t("featureOwnerDesc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-14">
          <div
            className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("pricingTrial")}
            </div>
            <h1 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/${locale}/signup`}
                className="rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 75%, var(--accent)))" }}
              >
                {t("ctaSignup")}
              </Link>
              <Link
                href={`/${locale}/login`}
                className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                {t("ctaLogin")}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              >
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-border bg-muted/40 px-5 py-12">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="font-serif text-2xl text-foreground">{t("pricingTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("pricingTrial")}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
        {t("footer", { year })}
      </footer>
    </div>
  );
}
