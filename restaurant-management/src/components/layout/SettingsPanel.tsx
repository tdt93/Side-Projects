"use client";

import { useMemo, useState, useEffect } from "react";
import { Moon, Sun, Monitor, Upload, Plug } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { AppSelect } from "@/components/ui/AppSelect";
import { ColorPresetPicker } from "@/components/ui/ColorPresetPicker";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import { generateColorPresets } from "@/lib/color-presets";
import type { ColorPreset } from "@/lib/color-presets";
import { LOCALE_FLAGS } from "@/lib/location-scope";
import { routing, type Locale } from "@/i18n/routing";

type ThemeMode = "light" | "dark" | "system";

export function SettingsPanel() {
  const t = useTranslations("owner");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { tenant, settings, refresh } = useRestaurant();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [brandBase, setBrandBase] = useState<string | null>(null);

  const currency = settings?.currency ?? "PLN";
  const posEnabled = settings?.posEnabled ?? false;
  const posProvider = settings?.posProvider ?? "";
  const activeTheme = (settings?.themeMode ?? theme ?? "light") as ThemeMode;
  const primary = tenant?.primaryColor ?? "#C4622D";
  const accent = tenant?.accentColor ?? "#F59E0B";

  useEffect(() => {
    const stored = localStorage.getItem("brand-color-base");
    if (stored) setBrandBase(stored);
  }, []);

  const presets = useMemo(
    () => generateColorPresets(brandBase ?? primary),
    [brandBase, primary],
  );

  const presetLabels: Record<string, string> = {
    classic: t("colorPresetClassic"),
    warm: t("colorPresetWarm"),
    fresh: t("colorPresetFresh"),
  };

  const labeledPresets: ColorPreset[] = presets.map((p) => ({
    ...p,
    label: presetLabels[p.id] ?? p.label,
  }));

  async function patchSettings(body: Record<string, unknown>) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await refresh();
  }

  async function saveThemeMode(mode: ThemeMode) {
    setTheme(mode);
    await patchSettings({ themeMode: mode });
  }

  async function saveBrandColors(p: ColorPreset) {
    await patchSettings({ primaryColor: p.primary, accentColor: p.accent });
  }

  async function handleLogo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/settings", { method: "PATCH", body: fd });
      const data = await res.json();
      if (data.baseColor) {
        localStorage.setItem("brand-color-base", data.baseColor);
        setBrandBase(data.baseColor);
      }
      await refresh();
    } finally {
      setUploading(false);
    }
  }

  function switchLocale(next: Locale) {
    const segments = pathname.split("/");
    segments[1] = next;
    startTransition(() => router.replace(segments.join("/") || `/${next}`));
  }

  const themes: { id: ThemeMode; icon: typeof Sun; label: string }[] = [
    { id: "light", icon: Sun, label: tCommon("themeLight") },
    { id: "dark", icon: Moon, label: tCommon("themeDark") },
    { id: "system", icon: Monitor, label: tCommon("themeSystem") },
  ];

  return (
    <div className="space-y-3 animate-section-in">
      <div className="dashboard-card divide-y divide-border overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
            {tenant?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-primary">R</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{t("branding")}</h3>
            <p className="text-xs text-muted-foreground">{t("uploadLogoHint")}</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold transition-colors hover:bg-card">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? tCommon("loading") : t("uploadLogo")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && void handleLogo(e.target.files[0])}
            />
          </label>
        </div>

        <div className="p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("colorPresets")}
          </p>
          <ColorPresetPicker
            presets={labeledPresets}
            activePrimary={primary}
            activeAccent={accent}
            onSelect={(p) => void saveBrandColors(p)}
          />
        </div>
      </div>

      <div className="dashboard-card grid gap-4 p-4 sm:grid-cols-2">
        <AppSelect
          label={t("currency")}
          value={currency}
          onChange={(e) => void patchSettings({ currency: e.target.value })}
        >
          {["PLN", "EUR", "USD", "VND"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </AppSelect>

        <AppSelect
          label={t("menuMode")}
          value={settings?.menuMode ?? "mixed"}
          onChange={(e) => void patchSettings({ menuMode: e.target.value })}
        >
          <option value="shared">{t("menuModeShared")}</option>
          <option value="mixed">{t("menuModeMixed")}</option>
          <option value="per_location">{t("menuModePerLocation")}</option>
        </AppSelect>
      </div>

      <div className="dashboard-card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-1">
          {(settings?.enabledLanguages ?? routing.locales).map((loc) => (
            <button
              key={loc}
              type="button"
              disabled={pending}
              title={loc.toUpperCase()}
              onClick={() => switchLocale(loc as Locale)}
              className={`rounded-lg px-2 py-1 text-base transition-all duration-200 ${
                locale === loc
                  ? "bg-primary text-primary-foreground scale-105 shadow-sm"
                  : "opacity-50 hover:opacity-100"
              }`}
            >
              {LOCALE_FLAGS[loc] ?? loc}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/50 p-0.5">
          {themes.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => void saveThemeMode(id)}
              className={`rounded-lg p-2 transition-all duration-200 ${
                activeTheme === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-card space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="stat-card-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("posIntegration")}</h3>
            <p className="text-xs text-muted-foreground">{t("posIntegrationHint")}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={posEnabled}
            onChange={(e) => void patchSettings({ posEnabled: e.target.checked })}
          />
          {t("posEnabled")}
        </label>
        <AppSelect
          label={t("posProvider")}
          value={posProvider}
          disabled={!posEnabled}
          onChange={(e) => void patchSettings({ posProvider: e.target.value })}
        >
          <option value="">{t("posProviderNone")}</option>
          <option value="square">Square</option>
          <option value="toast">Toast</option>
          <option value="lightspeed">Lightspeed</option>
          <option value="custom">{t("posProviderCustom")}</option>
        </AppSelect>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("posEndpoint")}</span>
          <input
            type="url"
            disabled={!posEnabled}
            defaultValue={settings?.posEndpoint ?? ""}
            placeholder="https://api.example.com/pos"
            onBlur={(e) => void patchSettings({ posEndpoint: e.target.value || null })}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </label>
        <p className="text-[0.65rem] text-muted-foreground">{t("posComingSoon")}</p>
      </div>
    </div>
  );
}
