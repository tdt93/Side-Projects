import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { therapistPublicPath } from "@/lib/therapist-path";

/** Legacy `/t/slug` → `/city-segment` */
export default async function LegacyTherapistSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await prisma.therapistProfile.findUnique({
    where: { slug },
    select: { officeCity: true },
  });
  if (!profile) notFound();
  permanentRedirect(therapistPublicPath({ city: profile.officeCity }));
}
