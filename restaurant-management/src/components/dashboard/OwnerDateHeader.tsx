"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LocationSelector } from "@/components/layout/LocationSelector";

type Props = {
  sectionLabel?: string;
  showBreadcrumb?: boolean;
  showLocation?: boolean;
};

export function OwnerDateHeader({ sectionLabel, showBreadcrumb = true, showLocation = true }: Props) {
  const t = useTranslations("owner");
  const locale = useLocale();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = now.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="border-b border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="font-serif text-base font-bold tracking-tight text-foreground sm:text-lg">{today}</p>
          <p className="font-mono text-sm font-semibold tabular-nums text-primary">{time}</p>
        </div>
        {showLocation && <LocationSelector compact />}
      </div>
      {showBreadcrumb && sectionLabel && (
        <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2 sm:px-6">
          <span className="text-xs text-muted-foreground">{t("ownerBreadcrumb")}</span>
          <span className="text-xs text-muted-foreground/60">/</span>
          <span className="text-xs font-semibold text-foreground">{sectionLabel}</span>
        </div>
      )}
    </div>
  );
}
