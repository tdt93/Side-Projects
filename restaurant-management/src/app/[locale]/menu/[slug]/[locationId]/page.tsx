"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useParams, useRouter } from "next/navigation";

export default function LegacyMenuRedirectPage() {
  const params = useParams<{ slug: string; locationId: string }>();
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${locale}/${params.slug}/menu?locationId=${encodeURIComponent(params.locationId)}`);
  }, [locale, params.slug, params.locationId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading…
    </div>
  );
}
