"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useTranslations } from "next-intl";
import { OrderItemsGrouped } from "@/components/dashboard/OrderItemsGrouped";
import type { MenuItemDto } from "@/components/providers/RestaurantProvider";
import { formatMoney } from "@/lib/currency";

type HistoryOrder = {
  id: string;
  tableNumber: number | null;
  status: string;
  source: string;
  placedAt: string;
  customerName?: string;
  totalGrosze: number;
  items: { menuItemId: string; name: string; quantity: number; priceGrosze: number }[];
};

export function OrderHistoryPanel({
  menuItems,
  currency,
  dark = true,
}: {
  menuItems: MenuItemDto[];
  currency: string;
  dark?: boolean;
}) {
  const t = useTranslations("staffHistory");
  const tOrder = useTranslations("orderStatus");
  const tCommon = useTranslations("common");
  const [range, setRange] = useState<"day" | "month">("day");
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/orders/history?range=${range}`)
      .then((r) => r.json())
      .then((data: { orders: HistoryOrder[] }) => setOrders(data.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [range]);

  const shell = dark ? "border-white/10 bg-[#1C1410]" : "dashboard-card";
  const muted = dark ? "text-[#6B5B50]" : "text-muted-foreground";
  const text = dark ? "text-[#FAFAF7]" : "text-foreground";

  return (
    <div className="flex h-full flex-col">
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${dark ? "border-white/10 bg-[#120D09]" : "border-border"}`}>
        <div className="flex items-center gap-2">
          <History className={`h-4 w-4 ${muted}`} />
          <h3 className={`text-sm font-semibold ${text}`}>{t("title")}</h3>
        </div>
        <div className={`inline-flex rounded-xl p-1 ${dark ? "bg-white/5" : "bg-muted"}`}>
          {(["day", "month"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`interactive rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                range === r
                  ? dark
                    ? "bg-primary text-white"
                    : "bg-primary text-primary-foreground"
                  : muted
              }`}
            >
              {r === "day" ? t("today") : t("thisMonth")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading && <p className={`text-sm ${muted}`}>{tCommon("loading")}</p>}
        {!loading && orders.length === 0 && (
          <div className={`flex flex-col items-center py-16 ${muted}`}>
            <History className="mb-2 h-10 w-10 opacity-40" />
            {t("empty")}
          </div>
        )}
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className={`rounded-2xl border p-4 ${shell}`}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className={`font-semibold ${text}`}>
                    {order.tableNumber ? tCommon("table", { number: order.tableNumber }) : t("onlineOrder")}
                    {order.customerName ? ` · ${order.customerName}` : ""}
                  </p>
                  <p className={`text-xs ${muted}`}>
                    {new Date(order.placedAt).toLocaleString()} · #{order.id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase ${dark ? "bg-white/10 text-[#D4C4B8]" : "bg-muted"}`}>
                    {tOrder(order.status as "paid" | "served")}
                  </span>
                  <p className={`mt-1 font-mono text-sm font-bold ${dark ? "text-[#FCD34D]" : "text-primary"}`}>
                    {formatMoney(order.totalGrosze, currency)}
                  </p>
                </div>
              </div>
              <OrderItemsGrouped
                items={order.items}
                menuItems={menuItems}
                currency={currency}
                dark={dark}
                compact
                showPrices={false}
              />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
