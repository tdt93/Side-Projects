
export type HomeStatItem = {
  value: string;
  label: string;
};

export type MediaLogoItem = {
  imageUrl: string;
  alt?: string;
  href?: string;
};

export type WhyBenefitItem = {
  icon: string;
  text: string;
};

export type WhyTrzymsieSection = {
  title: string;
  benefits: WhyBenefitItem[];
};

export type SitePublicContent = {
  faviconUrl: string | null;
  homeStats: HomeStatItem[];
  mediaPress: {
    label: string;
    logos: MediaLogoItem[];
  };
  whyTrzymsie: WhyTrzymsieSection;
};

const DEFAULT_STATS: HomeStatItem[] = [
  { value: "8000+", label: "pacjentów zaufało nam" },
  { value: "2000+", label: "sesji miesięcznie" },
  { value: "14+", label: "lat pomagamy Wam online" },
];

const DEFAULT_MEDIA: SitePublicContent["mediaPress"] = {
  label: "MÓWIĄ O NAS:",
  logos: [],
};

const DEFAULT_WHY: WhyTrzymsieSection = {
  title: "Dlaczego trzymsie.pl?",
  benefits: [
    {
      icon: "experience",
      text: "od 14 lat wspieramy w drodze do poprawy samopoczucia - pomogliśmy już tysiącom osób",
    },
    {
      icon: "online",
      text: "sesje CBT online są tak samo skuteczne jak te w gabinecie",
    },
    {
      icon: "cbt",
      text: "terapia poznawczo-behawioralna (CBT) jest najbardziej udokumentowanym pod kątem skuteczności nurtem terapii, opartym na dowodach",
    },
    {
      icon: "therapists",
      text: "współpracujemy z 100+ psychoterapeutami nurtu poznawczo-behawioralnego o szerokim zakresie specjalizacji",
    },
    {
      icon: "privacy",
      text: "realizujemy sesje w sposób bezpieczny i zapewniający prywatność",
    },
    {
      icon: "calendar",
      text: "zapewniamy szeroką dostępność terminów",
    },
  ],
};

type FooterCompanyJson = {
  legalName?: string;
  addressLine1?: string;
  addressLine2?: string;
  email?: string;
  registryText?: string;
};

export type SiteSettingsStorage = {
  faviconUrl?: string;
  footerCompany?: FooterCompanyJson;
  homeStats?: HomeStatItem[];
  mediaPress?: {
    label?: string;
    logos?: MediaLogoItem[];
  };
  whyTrzymsie?: {
    title?: string;
    benefits?: WhyBenefitItem[];
  };
};

export function parseSiteSettingsStorage(raw: string | null): SiteSettingsStorage {
  if (!raw?.trim()) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) {
      return o as SiteSettingsStorage;
    }
  } catch {
    /* legacy */
  }
  return {};
}

export function sitePublicContentFromSettings(s: {
  footerMarkdown: string | null;
}): SitePublicContent {
  const storage = parseSiteSettingsStorage(s.footerMarkdown);
  const stats = storage.homeStats?.filter(
    (x) => x?.value?.trim() && x?.label?.trim(),
  );
  const logos = storage.mediaPress?.logos?.filter((x) => x?.imageUrl?.trim()) ?? [];

  const benefits = storage.whyTrzymsie?.benefits?.filter(
    (x) => x?.text?.trim() && x?.icon?.trim(),
  );

  const faviconUrl = storage.faviconUrl?.trim() || null;

  return {
    faviconUrl,
    homeStats: stats?.length ? stats : DEFAULT_STATS,
    mediaPress: {
      label: storage.mediaPress?.label?.trim() || DEFAULT_MEDIA.label,
      logos: logos.length ? logos : DEFAULT_MEDIA.logos,
    },
    whyTrzymsie: {
      title: storage.whyTrzymsie?.title?.trim() || DEFAULT_WHY.title,
      benefits: benefits?.length ? benefits : DEFAULT_WHY.benefits,
    },
  };
}

export function serializeSiteSettingsStorage(
  previousMarkdown: string | null,
  patch: {
    footerCompany?: {
      companyLegalName: string;
      companyAddressLine1: string;
      companyAddressLine2: string;
      companyEmail: string;
      companyRegistryText: string;
    };
    homeStats?: HomeStatItem[];
    mediaPress?: SitePublicContent["mediaPress"];
    whyTrzymsie?: WhyTrzymsieSection;
    faviconUrl?: string;
  },
): string {
  const base = parseSiteSettingsStorage(previousMarkdown);

  if (patch.faviconUrl !== undefined) {
    const url = patch.faviconUrl.trim();
    if (url) base.faviconUrl = url;
    else delete base.faviconUrl;
  }

  if (patch.footerCompany) {
    const fc: FooterCompanyJson = {};
    const put = (key: keyof FooterCompanyJson, value: string) => {
      const t = value.trim();
      if (t) fc[key] = t;
    };
    put("legalName", patch.footerCompany.companyLegalName);
    put("addressLine1", patch.footerCompany.companyAddressLine1);
    put("addressLine2", patch.footerCompany.companyAddressLine2);
    put("email", patch.footerCompany.companyEmail);
    put("registryText", patch.footerCompany.companyRegistryText);
    base.footerCompany = fc;
  }

  if (patch.homeStats) {
    base.homeStats = patch.homeStats
      .map((x) => ({ value: x.value.trim(), label: x.label.trim() }))
      .filter((x) => x.value && x.label);
  }

  if (patch.mediaPress) {
    base.mediaPress = {
      label: patch.mediaPress.label.trim() || DEFAULT_MEDIA.label,
      logos: patch.mediaPress.logos
        .map((x) => ({
          imageUrl: x.imageUrl.trim(),
          alt: x.alt?.trim() || undefined,
          href: x.href?.trim() || undefined,
        }))
        .filter((x) => x.imageUrl),
    };
  }

  if (patch.whyTrzymsie) {
    base.whyTrzymsie = {
      title: patch.whyTrzymsie.title.trim() || DEFAULT_WHY.title,
      benefits: patch.whyTrzymsie.benefits
        .map((x) => ({ icon: x.icon.trim(), text: x.text.trim() }))
        .filter((x) => x.icon && x.text),
    };
  }

  return JSON.stringify(base);
}

/** Re-export for actions that only update footer company fields. */
export function serializeFooterCompanyToMarkdown(
  previousMarkdown: string | null,
  fields: {
    companyLegalName: string;
    companyAddressLine1: string;
    companyAddressLine2: string;
    companyEmail: string;
    companyRegistryText: string;
  },
): string {
  return serializeSiteSettingsStorage(previousMarkdown, { footerCompany: fields });
}

export function formatTherapistOfficeAddress(
  officeAddressLine: string | null,
  officeCity: string | null,
): string | null {
  const parts = [officeAddressLine, officeCity].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

export function parseMediaLogosLines(raw: string): MediaLogoItem[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const imageUrl = parts[0] ?? "";
      const alt = parts[1] || undefined;
      const href = parts[2] || undefined;
      return { imageUrl, alt, href };
    })
    .filter((x) => x.imageUrl);
}

export function serializeMediaLogosLines(logos: MediaLogoItem[]): string {
  return logos
    .map((x) => {
      const parts = [x.imageUrl];
      if (x.alt) parts.push(x.alt);
      if (x.href) parts.push(x.href);
      return parts.join("|");
    })
    .join("\n");
}

export function parseWhyBenefitsLines(raw: string): WhyBenefitItem[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.indexOf("|");
      if (pipe === -1) return { icon: "experience", text: line };
      return {
        icon: line.slice(0, pipe).trim(),
        text: line.slice(pipe + 1).trim(),
      };
    })
    .filter((x) => x.text);
}

export function serializeWhyBenefitsLines(benefits: WhyBenefitItem[]): string {
  return benefits.map((x) => `${x.icon}|${x.text}`).join("\n");
}
