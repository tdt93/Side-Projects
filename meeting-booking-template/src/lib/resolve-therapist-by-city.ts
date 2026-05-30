import { prisma } from "@/lib/db";
import { cityToPathSegment } from "@/lib/therapist-path";

/** Finds therapist slug for a URL city segment (e.g. `gdansk` → therapist in Gdańsk). */
export async function resolveTherapistSlugByCitySegment(
  citySegment: string,
): Promise<string | null> {
  const normalized = citySegment.trim().toLowerCase();
  if (!normalized) return null;

  const therapists = await prisma.therapistProfile.findMany({
    where: { officeCity: { not: null } },
    select: { slug: true, officeCity: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  const matches = therapists.filter(
    (t) => cityToPathSegment(t.officeCity) === normalized,
  );
  return matches[0]?.slug ?? null;
}
