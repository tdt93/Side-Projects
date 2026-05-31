"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function SignupPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [form, setForm] = useState({
    restaurantName: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [staffPins, setStaffPins] = useState<{ kitchen: string; cashier: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: form.restaurantName,
          ownerName: form.ownerName,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error");
        return;
      }
      if (data.staffPins) {
        setStaffPins(data.staffPins);
        return;
      }
      router.push(`/${locale}/login?registered=1`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-foreground">{t("signupTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("signupSubtitle")}</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {[
              { key: "restaurantName", label: t("restaurantName"), type: "text" },
              { key: "ownerName", label: t("ownerName"), type: "text" },
              { key: "email", label: t("email"), type: "email" },
              { key: "password", label: t("password"), type: "password" },
              { key: "confirmPassword", label: t("confirmPassword"), type: "password" },
            ].map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {field.label}
                </label>
                <input
                  required
                  type={field.type}
                  value={(form as Record<string, string>)[field.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {staffPins && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
                <p className="font-semibold">{t("staffPinsTitle")}</p>
                <p className="mt-1 text-muted-foreground">{t("staffPinsNote")}</p>
                <ul className="mt-3 space-y-1 font-mono">
                  <li>{t("roles.kitchen")}: {staffPins.kitchen}</li>
                  <li>{t("roles.cashier")}: {staffPins.cashier}</li>
                </ul>
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/login?registered=1`)}
                  className="btn-primary mt-4 w-full py-2.5 text-sm"
                >
                  {t("continueToLogin")}
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || Boolean(staffPins)}
              className="w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, var(--accent)))" }}
            >
              {loading ? "…" : t("createAccount")}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link href={`/${locale}/login`} className="font-semibold text-primary">
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
