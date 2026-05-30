"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { routing, type Locale } from "@/i18n/routing";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import { LOCALE_FLAGS } from "@/lib/location-scope";

type ThemeMode = "light" | "dark" | "system";

export function SettingsPanel({
  onLogoUpload,
  saved,
  onSave,
}: {
  onLogoUpload: (file: File) => void;
  saved: boolean;
  onSave: () => void;
}) {
  const t = useTranslations("owner");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { tenant, settings } = useRestaurant();
  const [pending, startTransition] = useTransition();

  const currency = settings?.currency ?? "PLN";
  const activeTheme = (settings?.themeMode ?? theme ?? "light") as ThemeMode;

  function switchLocale(next: Locale) {
    const segments = pathname.split("/");
    segments[1] = next;
    startTransition(() => router.replace(segments.join("/") || `/${next}`));
  }

  async function saveThemeMode(mode: ThemeMode) {
    setTheme(mode);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeMode: mode }),
    });
  }

  async function saveBrandColors(primary: string, accent: string) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryColor: primary, accentColor: accent }),
    });
  }

  async function saveMenuMode(mode: string) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuMode: mode }),
    });
  }

  const themes: { id: ThemeMode; icon: typeof Sun; label: string }[] = [
    { id: "light", icon: Sun, label: tCommon("themeLight") },
    { id: "dark", icon: Moon, label: tCommon("themeDark") },
    { id: "system", icon: Monitor, label: tCommon("themeSystem") },
  ];

  return (
    <div className="space-y-4">
      <div className="dashboard-card p-5">
        <h3 className="mb-2 font-semibold">{t("branding")}</h3>
        <p className="mb-3 text-sm text-muted-foreground">{t("uploadLogoHint")}</p>
        <label className="mb-4 inline-flex cursor-pointer rounded-xl bg-muted px-4 py-2 text-sm font-medium">
          {t("uploadLogo")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogoUpload(e.target.files[0])} />
        </label>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tCommon("brandColors")}</p>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{tCommon("primaryColor")}</span>
            <input
              type="color"
              defaultValue={tenant?.primaryColor ?? "#C4622D"}
              onChange={(e) => void saveBrandColors(e.target.value, tenant?.accentColor ?? "#F59E0B")}
              className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{tCommon("accentColor")}</span>
            <input
              type="color"
              defaultValue={tenant?.accentColor ?? "#F59E0B"}
              onChange={(e) => void saveBrandColors(tenant?.primaryColor ?? "#C4622D", e.target.value)}
              className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
            />
          </label>
        </div>
      </div>

      <div className="dashboard-card p-5">
        <h3 className="mb-2 font-semibold">{t("currency")}</h3>
        <select
          defaultValue={currency}
          className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm"
          onChange={(e) => void fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: e.target.value }) })}
        >
          {["PLN", "EUR", "USD", "VND"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="dashboard-card p-5">
        <h3 className="mb-2 font-semibold">{t("menuMode")}</h3>
        <p className="mb-3 text-sm text-muted-foreground">{t("menuModeHint")}</p>
        <select
          defaultValue={settings?.menuMode ?? "mixed"}
          className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm"
          onChange={(e) => void saveMenuMode(e.target.value)}
        >
          <option value="shared">{t("menuModeShared")}</option>
          <option value="mixed">{t("menuModeMixed")}</option>
          <option value="per_location">{t("menuModePerLocation")}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white sm:w-auto"
        style={{ background: saved ? "#16A34A" : "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 85%, var(--accent)))" }}
      >
        {saved ? t("saved") : tCommon("save")}
      </button>

      <div className="dashboard-card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-1">
          {(settings?.enabledLanguages ?? routing.locales).map((loc) => (
            <button
              key={loc}
              type="button"
              disabled={pending}
              title={loc.toUpperCase()}
              onClick={() => switchLocale(loc as Locale)}
              className="rounded-md px-1.5 py-1 text-base transition-all"
              style={{
                background: locale === loc ? "var(--primary)" : "transparent",
                opacity: locale === loc ? 1 : 0.55,
                transform: locale === loc ? "scale(1.1)" : "scale(1)",
              }}
            >
              {LOCALE_FLAGS[loc] ?? loc}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          {themes.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => void saveThemeMode(id)}
              className="rounded-md p-1.5 transition-all"
              style={{
                background: activeTheme === id ? "var(--primary)" : "var(--muted)",
                color: activeTheme === id ? "#fff" : "var(--muted-foreground)",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
