"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Role = "SUPER_ADMIN" | "THERAPIST";

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin" || pathname === "/admin/";
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function linkClassName(active: boolean, variant: "mobile" | "desktop") {
  const base =
    variant === "mobile"
      ? "inline-flex min-w-[7.5rem] flex-1 justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition sm:flex-none sm:min-w-0"
      : "w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition";
  return active
    ? `${base} bg-green-600 text-white shadow-sm`
    : `${base} text-[#003C79] hover:bg-[#F3FAFC]`;
}

export function AdminDashboardNav({
  variant,
  role,
}: {
  variant: "mobile" | "desktop";
  role: Role;
}) {
  const pathname = usePathname() ?? "";

  const superAdminLinks: { href: string; label: string }[] = [
    { href: "/admin/site", label: "Ustawienia strony" },
    { href: "/admin/therapists", label: "Terapeuci" },
    { href: "/admin/bookings", label: "Wizyty" },
    { href: "/admin/clients", label: "Klienci" },
  ];
  const therapistLinks: { href: string; label: string }[] = [
    { href: "/admin/schedule", label: "Grafik / Kalendarz" },
    { href: "/admin/clients", label: "Klienci" },
  ];

  const items: { href: string; label: string }[] = [];
  if (role === "SUPER_ADMIN") {
    items.push(...superAdminLinks);
  }
  if (role === "THERAPIST" || role === "SUPER_ADMIN") {
    if (role === "SUPER_ADMIN") {
      items.push({ href: "/admin/schedule", label: "Grafik / Kalendarz" });
    } else {
      items.push(...therapistLinks);
    }
  }

  if (variant === "mobile") {
    return (
      <nav className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2 px-6 py-4 sm:justify-start">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={linkClassName(isNavActive(pathname, item.href), "mobile")}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex w-full flex-col items-stretch gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClassName(isNavActive(pathname, item.href), "desktop")}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
