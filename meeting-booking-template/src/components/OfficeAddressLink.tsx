"use client";

import type { ReactNode, MouseEvent } from "react";

export function OfficeAddressLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  function scrollToMap(e: MouseEvent) {
    e.preventDefault();
    const el = document.getElementById("gabinet-mapa");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (window.history.replaceState) {
        window.history.replaceState(null, "", "#gabinet-mapa");
      }
    }
  }

  return (
    <a
      href="#gabinet-mapa"
      onClick={scrollToMap}
      className={className}
    >
      {children}
    </a>
  );
}
