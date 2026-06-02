"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppSelect } from "@/components/ui/AppSelect";
import { useRestaurant } from "@/components/providers/RestaurantProvider";

export function LocationSelector({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const t = useTranslations("owner");
  const { locations, activeLocationId, viewAllLocations, setActiveLocation, staffRole } = useRestaurant();

  if (locations.length <= 1 && staffRole !== "OWNER") return null;

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "min-w-0"}`}>
      {!compact && (
        <MapPin className={`h-3.5 w-3.5 shrink-0 ${dark ? "text-[#6B5B50]" : "text-muted-foreground"}`} />
      )}
      <AppSelect
        compact
        aria-label={t("selectBranch")}
        className={`max-w-[180px] sm:max-w-[220px] ${dark ? "border-white/10 bg-white/5 text-[#FAFAF7]" : ""}`}
        value={viewAllLocations ? "__all__" : (activeLocationId ?? locations[0]?.id ?? "")}
        onChange={(e) => {
          const v = e.target.value;
          void setActiveLocation(v === "__all__" ? null : v);
        }}
      >
        {staffRole === "OWNER" && <option value="__all__">{t("allLocations")}</option>}
        {locations.filter((l) => l.isActive).map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </AppSelect>
    </div>
  );
}
