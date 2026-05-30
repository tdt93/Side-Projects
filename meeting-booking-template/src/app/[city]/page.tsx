import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  TherapistProfilePage,
  generateTherapistProfileMetadata,
} from "@/lib/therapist-profile-page";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { resolveTherapistSlugByCitySegment } from "@/lib/resolve-therapist-by-city";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const slug = await resolveTherapistSlugByCitySegment(city);
  if (!slug) return buildSiteMetadata();
  return generateTherapistProfileMetadata(slug);
}

export default async function CityTherapistPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { city } = await params;
  const sp = await searchParams;
  const slug = await resolveTherapistSlugByCitySegment(city);
  if (!slug) notFound();

  return TherapistProfilePage({ slug, searchParams: sp });
}
