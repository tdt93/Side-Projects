/** Nominative + locative (miejscownik: „w …”) for SEO titles. */
export type CitySeoForms = {
  nominative: string;
  locative: string;
};

const CITY_FORMS: Record<string, CitySeoForms> = {
  gdańsk: { nominative: "Gdańsk", locative: "Gdańsku" },
  gdansk: { nominative: "Gdańsk", locative: "Gdańsku" },
  ostrołęka: { nominative: "Ostrołęka", locative: "Ostrołęce" },
  ostroleka: { nominative: "Ostrołęka", locative: "Ostrołęce" },
  warszawa: { nominative: "Warszawa", locative: "Warszawie" },
  kraków: { nominative: "Kraków", locative: "Krakowie" },
  krakow: { nominative: "Kraków", locative: "Krakowie" },
  wrocław: { nominative: "Wrocław", locative: "Wrocławiu" },
  wroclaw: { nominative: "Wrocław", locative: "Wrocławiu" },
  poznań: { nominative: "Poznań", locative: "Poznaniu" },
  poznan: { nominative: "Poznań", locative: "Poznaniu" },
  łódź: { nominative: "Łódź", locative: "Łodzi" },
  lodz: { nominative: "Łódź", locative: "Łodzi" },
  szczecin: { nominative: "Szczecin", locative: "Szczecinie" },
  bydgoszcz: { nominative: "Bydgoszcz", locative: "Bydgoszczy" },
  lublin: { nominative: "Lublin", locative: "Lublinie" },
  katowice: { nominative: "Katowice", locative: "Katowicach" },
  białystok: { nominative: "Białystok", locative: "Białymstoku" },
  bialystok: { nominative: "Białystok", locative: "Białymstoku" },
  toruń: { nominative: "Toruń", locative: "Toruniu" },
  torun: { nominative: "Toruń", locative: "Toruniu" },
};

function lookupKey(city: string): string {
  return city.trim().toLowerCase();
}

export function citySeoForms(officeCity: string | null | undefined): CitySeoForms | null {
  if (!officeCity?.trim()) return null;
  const key = lookupKey(officeCity);
  const known = CITY_FORMS[key];
  if (known) return known;
  const trimmed = officeCity.trim();
  return { nominative: trimmed, locative: trimmed };
}

export const DEFAULT_SITE_TITLE = "trzymsie.pl - Psychoterapia";

export function therapistPageTitle(officeCity: string | null | undefined): string {
  const forms = citySeoForms(officeCity);
  if (!forms) return DEFAULT_SITE_TITLE;
  return `trzymsie.pl - Psychoterapia ${forms.nominative}, Psycholog w ${forms.locative}`;
}
