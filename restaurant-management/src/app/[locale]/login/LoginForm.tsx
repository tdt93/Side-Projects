"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { navigateTo } from "@/lib/client-navigate";

export default function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(t("invalidCredentials"));
        return;
      }
      navigateTo(`/${locale}/app/roles`);
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
          <h1 className="font-serif text-2xl text-foreground">{t("loginTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("loginSubtitle")}</p>
          {registered && (
            <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              {t("registeredSuccess")}
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("email")}
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("password")}
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, var(--accent)))" }}
            >
              {loading ? "…" : t("signIn")}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href={`/${locale}/signup`} className="font-semibold text-primary">
              {t("createAccount")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
