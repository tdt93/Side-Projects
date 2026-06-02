"use client";

import type { ReactNode } from "react";

export function SectionTransition({ sectionKey, children }: { sectionKey: string; children: ReactNode }) {
  return (
    <div key={sectionKey} className="animate-section-in">
      {children}
    </div>
  );
}
