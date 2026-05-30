function toAsciiLower(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function cityToPathSegment(city: string | null | undefined): string {
  if (!city?.trim()) return "miasto";
  return toAsciiLower(city)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Public therapist URL: `https://gabinety.trzymsie.pl/gdansk` */
export function therapistPublicPath(opts: {
  city: string | null | undefined;
}): string {
  return `/${cityToPathSegment(opts.city)}`;
}

export const BOOKING_APP_HOST = "gabinety.trzymsie.pl";

/** Paths to revalidate after therapist profile changes. */
export function therapistRevalidatePaths(profile: {
  officeCity: string | null;
  slug: string;
}): string[] {
  return [
    therapistPublicPath({ city: profile.officeCity }),
    `/t/${profile.slug}`,
  ];
}
