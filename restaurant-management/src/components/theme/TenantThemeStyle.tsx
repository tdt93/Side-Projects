"use client";

import { useEffect } from "react";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import { themeVariables } from "@/lib/theme";

/** Applies tenant brand colors via CSS variables (avoids <style> tags in client components). */
export function TenantThemeStyle() {
  const { tenant } = useRestaurant();

  useEffect(() => {
    if (!tenant) return;

    const vars = themeVariables(tenant.primaryColor, tenant.accentColor);
    const root = document.documentElement;
    const previous = new Map<string, string>();

    for (const [key, value] of Object.entries(vars)) {
      previous.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, value);
    }

    return () => {
      for (const [key, prev] of previous) {
        if (prev) root.style.setProperty(key, prev);
        else root.style.removeProperty(key);
      }
    };
  }, [tenant?.primaryColor, tenant?.accentColor]);

  return null;
}
