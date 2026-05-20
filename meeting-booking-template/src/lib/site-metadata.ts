import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { DEFAULT_SITE_TITLE } from "@/lib/polish-city-seo";
import { sitePublicContentFromSettings } from "@/lib/site-public-content";

export { DEFAULT_SITE_TITLE };

export async function getSiteSettingsRecord() {
  return (
    (await prisma.siteSettings.findFirst()) ??
    (await prisma.siteSettings.create({ data: { siteName: "Trzymsię.pl" } }))
  );
}

export function faviconMetadata(faviconUrl: string | null | undefined): Metadata["icons"] {
  const url = faviconUrl?.trim();
  if (!url) return undefined;
  return { icon: [{ url }] };
}

export async function buildSiteMetadata(
  overrides: Metadata = {},
): Promise<Metadata> {
  const settings = await getSiteSettingsRecord();
  const { faviconUrl } = sitePublicContentFromSettings(settings);

  return {
    title: DEFAULT_SITE_TITLE,
    description: "Psychoterapia poznawczo-behawioralna online i stacjonarnie.",
    icons: faviconMetadata(faviconUrl),
    ...overrides,
  };
}
