import { parseSiteSettingsStorage } from "@/lib/site-public-content";



export type PublicFooterCompany = {

  legalName: string;

  addressLine1: string;

  addressLine2: string;

  email: string;

  registryText: string;

};



const DEFAULTS: PublicFooterCompany = {

  legalName: "Trzymsie.pl sp. z o.o.",

  addressLine1: "ul. Marszałkowska 58/15",

  addressLine2: "00-545 Warszawa, Polska",

  email: "recepcja@trzymsie.pl",

  registryText: [

    "NIP: 7011197702",

    "KRS: 0001096909",

    "REGON: 528214933",

    "Kapitał Zakładowy: 5.000 PLN",

    "Sąd Rejonowy dla m. st. Warszawy w Warszawie XII Wydział Gospodarczy KRS",

  ].join("\n"),

};



export function footerCompanyFromSettings(s: {

  footerMarkdown: string | null;

}): PublicFooterCompany {

  const c = parseSiteSettingsStorage(s.footerMarkdown).footerCompany ?? {};

  return {

    legalName: c.legalName?.trim() || DEFAULTS.legalName,

    addressLine1: c.addressLine1?.trim() || DEFAULTS.addressLine1,

    addressLine2: c.addressLine2?.trim() || DEFAULTS.addressLine2,

    email: c.email?.trim() || DEFAULTS.email,

    registryText: c.registryText?.trim() || DEFAULTS.registryText,

  };

}



export { serializeFooterCompanyToMarkdown } from "@/lib/site-public-content";


