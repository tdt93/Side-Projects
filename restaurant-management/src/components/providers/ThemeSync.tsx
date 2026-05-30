"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useRestaurant } from "@/components/providers/RestaurantProvider";

/** Syncs saved themeMode from tenant settings to next-themes on load. */
export function ThemeSync() {
  const { settings } = useRestaurant();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (settings?.themeMode) {
      setTheme(settings.themeMode);
    }
  }, [settings?.themeMode, setTheme]);

  return null;
}
