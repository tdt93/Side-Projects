"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigateTo } from "@/lib/client-navigate";
import { roleDashboardPath } from "@/lib/routes";
import type { StaffRole } from "@/lib/session";

function requiredRole(pathname: string): StaffRole | null {
  if (pathname.includes("/owner")) return "OWNER";
  if (pathname.includes("/kitchen")) return "KITCHEN";
  if (pathname.includes("/cashier")) return "CASHIER";
  return null;
}

export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        if (cancelled) return;

        if (!session.accountId) {
          navigateTo(`/${locale}/login`);
          return;
        }

        const need = requiredRole(pathname);
        if (need && session.staffRole !== need) {
          if (session.staffRole) {
            navigateTo(roleDashboardPath(session.staffRole, locale));
          } else {
            navigateTo(`/${locale}/app/roles`);
          }
          return;
        }

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) navigateTo(`/${locale}/login`);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">…</p>
      </div>
    );
  }

  return children;
}
