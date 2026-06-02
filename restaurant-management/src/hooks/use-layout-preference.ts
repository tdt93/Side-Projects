"use client";

import { useEffect, useState } from "react";
import type { LayoutMode } from "@/components/ui/LayoutToggle";

export function useLayoutPreference(key: string, defaultValue: LayoutMode = "grid") {
  const [layout, setLayoutState] = useState<LayoutMode>(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored === "grid" || stored === "list" || stored === "compact") {
      setLayoutState(stored);
    }
  }, [key]);

  function setLayout(mode: LayoutMode) {
    setLayoutState(mode);
    localStorage.setItem(key, mode);
  }

  return [layout, setLayout] as const;
}
