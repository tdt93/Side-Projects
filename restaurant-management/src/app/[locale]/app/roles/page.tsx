"use client";

import { ChefHat, CreditCard, Eye, EyeOff, LayoutDashboard, LogOut, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { roleDashboardPath } from "@/lib/routes";

type StaffRoleKey = "KITCHEN" | "CASHIER" | "OWNER";

export default function RoleSelectPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [tenantName, setTenantName] = useState("RestoHub");
  const [selectedRole, setSelectedRole] = useState<StaffRoleKey | null>(null);
  const [credential, setCredential] = useState("");
  const [showCredential, setShowCredential] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [availableLocations, setAvailableLocations] = useState<{ id: string; name: string }[]>([]);
  const [pickLocation, setPickLocation] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.accountId) router.replace(`/${locale}/login`);
        if (data.tenantName) setTenantName(data.tenantName);
        if (data.staffRole) router.replace(roleDashboardPath(data.staffRole, locale));
      });
    void fetch("/api/restaurant/data")
      .then((r) => r.json())
      .then((data) => {
        if (data.locations?.length) {
          setAvailableLocations(data.locations);
          setSelectedLocationId(data.locations[0].id);
        }
      });
  }, [locale, router]);

  const roles = [
    {
      id: "KITCHEN" as const,
      label: t("roles.kitchen"),
      description: t("roles.kitchenDesc"),
      icon: ChefHat,
      hint: t("roles.pinHint"),
    },
    {
      id: "CASHIER" as const,
      label: t("roles.cashier"),
      description: t("roles.cashierDesc"),
      icon: CreditCard,
      hint: t("roles.pinHint"),
    },
    {
      id: "OWNER" as const,
      label: t("roles.owner"),
      description: t("roles.ownerDesc"),
      icon: LayoutDashboard,
      hint: t("staffPassword"),
    },
  ];

  async function handleLogin() {
    if (!selectedRole || !credential.trim()) {
      setError(t("incorrectStaff"));
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/staff-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: selectedRole,
        credential,
        locationId: selectedLocationId || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("incorrectStaff"));
      return;
    }
    const data = await res.json();
    if (data.needsLocationPick && data.locations?.length > 1) {
      setAvailableLocations(data.locations);
      setPickLocation(true);
      return;
    }
    router.push(roleDashboardPath(selectedRole, locale));
    router.refresh();
  }

  async function confirmLocation(locId: string) {
    await fetch("/api/restaurant/data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: locId }),
    });
    if (selectedRole) {
      router.push(roleDashboardPath(selectedRole, locale));
      router.refresh();
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/login`);
  }

  const selectedRoleData = roles.find((r) => r.id === selectedRole);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #0D0805 0%, #1C1410 50%, #261A0D 100%)" }}
    >
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            <Utensils className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl text-white">{tenantName}</h1>
          <p className="text-sm text-[#A89080]">{t("selectRole")}</p>
        </div>

        <div
          className="rounded-2xl p-6 backdrop-blur-sm"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="mb-4 grid grid-cols-3 gap-3">
            {roles.map((role) => {
              const Icon = role.icon;
              const isActive = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.id);
                    setCredential("");
                    setError("");
                  }}
                  className="rounded-xl border p-4 text-left transition-all"
                  style={{
                    background: isActive ? "rgba(196, 98, 45, 0.1)" : "rgba(255,255,255,0.03)",
                    borderColor: isActive ? "var(--primary)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <Icon className="mb-2 h-6 w-6" style={{ color: isActive ? "var(--accent)" : "#8A7060" }} />
                  <div className="text-xs font-semibold" style={{ color: isActive ? "#FAFAF7" : "#A89080" }}>
                    {role.label}
                  </div>
                  <div className="mt-0.5 text-[0.7rem]" style={{ color: "#6B5B50" }}>
                    {role.description}
                  </div>
                </button>
              );
            })}
          </div>

          {pickLocation ? (
            <div className="space-y-3">
              <p className="text-sm text-[#A89080]">{t("selectBranch")}</p>
              {availableLocations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => void confirmLocation(loc.id)}
                  className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm text-[#FAFAF7]"
                  style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          ) : selectedRole && (
            <div className="space-y-4">
              {availableLocations.length > 1 && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#A89080]">
                    {t("selectBranch")}
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm text-[#FAFAF7] outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {selectedRole === "OWNER" && (
                      <option value="">{t("allLocations")}</option>
                    )}
                    {availableLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#A89080]">
                  {selectedRole === "OWNER" ? t("staffPassword") : t("pinCode")}
                </label>
                <div className="relative">
                  <input
                    type={showCredential ? "text" : "password"}
                    value={credential}
                    onChange={(e) => {
                      setCredential(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
                    placeholder={selectedRoleData?.hint}
                    autoFocus
                    className="w-full rounded-xl px-4 py-3 pr-12 text-[#FAFAF7] outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: `1px solid ${error ? "#EF4444" : "rgba(255,255,255,0.1)"}`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCredential(!showCredential)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5B50]"
                  >
                    {showCredential ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              </div>
              <button
                type="button"
                onClick={() => void handleLogin()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 85%, white))" }}
              >
                {loading
                  ? t("signingIn")
                  : t("signInAs", { role: selectedRoleData?.label ?? "" })}
              </button>
            </div>
          )}

          {!selectedRole && !pickLocation && (
            <p className="py-4 text-center text-sm text-[#6B5B50]">{t("selectRoleHint")}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mx-auto mt-6 flex items-center gap-2 text-sm text-[#6B5B50] hover:text-[#A89080]"
        >
          <LogOut className="h-4 w-4" />
          {tCommon("logoutAccount")}
        </button>
      </div>
    </div>
  );
}
