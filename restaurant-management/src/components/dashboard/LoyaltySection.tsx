"use client";

import { Gift, Mail, Phone, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import { formatMoney } from "@/lib/currency";

export function LoyaltySection() {
  const t = useTranslations("owner.loyaltySection");
  const { customers, settings } = useRestaurant();
  const currency = settings?.currency ?? "PLN";

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="font-serif text-2xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="dashboard-card p-5">
          <Gift className="mb-2 h-5 w-5 text-primary" />
          <div className="font-mono text-2xl font-bold">{customers.length}</div>
          <p className="text-sm text-muted-foreground">{t("totalCustomers")}</p>
        </div>
        <div className="dashboard-card p-5">
          <ShoppingBag className="mb-2 h-5 w-5 text-primary" />
          <div className="font-mono text-2xl font-bold">
            {customers.reduce((s, c) => s + c.orderCount, 0)}
          </div>
          <p className="text-sm text-muted-foreground">{t("totalOrders")}</p>
        </div>
        <div className="dashboard-card p-5">
          <div className="font-mono text-2xl font-bold">
            {formatMoney(customers.reduce((s, c) => s + c.totalSpentGrosze, 0), currency)}
          </div>
          <p className="text-sm text-muted-foreground">{t("totalSpent")}</p>
        </div>
      </div>

      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">{t("customer")}</th>
                <th className="px-4 py-3">{t("contact")}</th>
                <th className="px-4 py-3 text-right">{t("orders")}</th>
                <th className="px-4 py-3 text-right">{t("spent")}</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    {t("empty")}
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      {c.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {c.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatMoney(c.totalSpentGrosze, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
