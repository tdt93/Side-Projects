import { Cormorant_Garamond, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

const sourceSans = Source_Sans_3({
  subsets: ["latin", "vietnamese", "latin-ext"],
  variable: "--font-sans-body",
});

const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  subsets: ["latin", "vietnamese", "latin-ext"],
  variable: "--font-serif-display",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono-data",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <div
      lang={locale}
      className={`${sourceSans.variable} ${cormorant.variable} ${ibmPlexMono.variable} min-h-full antialiased`}
    >
      <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
    </div>
  );
}
