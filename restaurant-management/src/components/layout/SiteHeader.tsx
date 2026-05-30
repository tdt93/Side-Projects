"use client";

import { Moon, Sun, Globe } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { routing, type Locale } from "@/i18n/routing";

export function SiteHeader({
  showAuth = true,
  tenantName,
}: {
  showAuth?: boolean;
  tenantName?: string;
}) {
  const t = useTranslations("common");
  const tLanding = useTranslations("landing");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  function switchLocale(next: Locale) {
    const segments = pathname.split("/");
    segments[1] = next;
    startTransition(() => router.replace(segments.join("/") || `/${next}`));
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            R
          </div>
          <span className="font-serif text-lg text-foreground">
            {tenantName ?? t("productName")}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              aria-label={t("language")}
              value={locale}
              disabled={pending}
              onChange={(e) => switchLocale(e.target.value as Locale)}
              className="rounded-lg border border-border bg-muted py-1.5 pl-8 pr-2 text-xs font-medium text-foreground outline-none"
            >
              {routing.locales.map((loc) => (
                <option key={loc} value={loc}>
                  {loc.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            aria-label={t("toggleTheme")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg border border-border bg-muted p-2 text-muted-foreground hover:text-foreground"
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </button>

          {showAuth && (
            <>
              <Link
                href={`/${locale}/login`}
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:inline-flex"
              >
                {t("login")}
              </Link>
              <Link
                href={`/${locale}/signup`}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-primary-foreground"
                style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, var(--accent)))" }}
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
