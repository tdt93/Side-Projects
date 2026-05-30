import { permanentRedirect } from "next/navigation";

/** Legacy `/gdansk/therapist-slug` → `/gdansk` */
export default async function LegacyCitySlugPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city } = await params;
  permanentRedirect(`/${encodeURIComponent(city)}`);
}
