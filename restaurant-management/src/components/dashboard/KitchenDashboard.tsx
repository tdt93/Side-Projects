"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  History,
  LogOut,
  Wifi,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { OrderHistoryPanel } from "@/components/dashboard/OrderHistoryPanel";
import { OrderItemsGrouped } from "@/components/dashboard/OrderItemsGrouped";
import { LocationSelector } from "@/components/layout/LocationSelector";
import { useRestaurant } from "@/components/providers/RestaurantProvider";

function ElapsedTime({ placedAt }: { placedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.floor((now - new Date(placedAt).getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const isUrgent = mins >= 20;
  const isWarning = mins >= 12 && mins < 20;

  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-medium"
      style={{
        background: isUrgent ? "rgba(239,68,68,0.2)" : isWarning ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.15)",
        color: isUrgent ? "#FCA5A5" : isWarning ? "#FCD34D" : "#86EFAC",
      }}
    >
      <Clock className="h-3 w-3" />
      {mins}:{String(secs).padStart(2, "0")}
    </span>
  );
}

export function KitchenDashboard({ embedded = false, onLogout }: { embedded?: boolean; onLogout?: () => void }) {
  const t = useTranslations("kitchen");
  const tOrder = useTranslations("orderStatus");
  const tFulfillment = useTranslations("orderFulfillment");
  const tCommon = useTranslations("common");
  const { tenant, settings, menuItems, orders, updateOrder } = useRestaurant();
  const currency = settings?.currency ?? "PLN";
  const [view, setView] = useState<"active" | "history">("active");
  const [filter, setFilter] = useState<string>("all");
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = orders.filter((o) => !["paid", "served"].includes(o.status));
  const filtered = filter === "all" ? active : active.filter((o) => o.status === filter);
  const pendingCount = active.filter((o) => o.status === "pending").length;
  const cookingCount = active.filter((o) => o.status === "cooking").length;
  const readyCount = active.filter((o) => o.status === "ready").length;

  const statusColor: Record<string, { bg: string; text: string; labelKey: "pending" | "cooking" | "ready" }> = {
    pending: { bg: "rgba(245,158,11,0.15)", text: "#FCD34D", labelKey: "pending" },
    cooking: { bg: "rgba(59,130,246,0.15)", text: "#93C5FD", labelKey: "cooking" },
    ready: { bg: "rgba(34,197,94,0.15)", text: "#86EFAC", labelKey: "ready" },
  };

  const nextAction: Record<string, { label: string; next: string; btnBg: string }> = {
    pending: { label: t("startCooking"), next: "cooking", btnBg: "var(--primary)" },
    cooking: { label: t("markReady"), next: "ready", btnBg: "#16A34A" },
    ready: { label: t("markServed"), next: "served", btnBg: "#3B82F6" },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0805] text-[#FAFAF7]">
      {!embedded && (
        <header className="flex items-center justify-between border-b border-white/10 bg-[#120D09] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg">{t("title")}</h2>
              <p className="text-xs text-[#6B5B50]">{tenant?.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LocationSelector dark compact />
            <div className="hidden items-center gap-2 sm:flex">
              <Wifi className="h-3.5 w-3.5 text-green-400" />
              <span className="font-mono text-xs text-[#4A3828]">
                {clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
            {!embedded && onLogout && (
              <button type="button" onClick={onLogout} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#8A7060]">
                <LogOut className="h-3.5 w-3.5" /> {tCommon("logoutStaff")}
              </button>
            )}
          </div>
        </header>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-[#120D09] px-4 py-3 sm:gap-4 sm:px-6">
        {[
          { label: t("pending"), count: pendingCount, color: "#FCD34D", bg: "rgba(245,158,11,0.1)", icon: AlertCircle },
          { label: t("cooking"), count: cookingCount, color: "#93C5FD", bg: "rgba(59,130,246,0.1)", icon: Flame },
          { label: t("ready"), count: readyCount, color: "#86EFAC", bg: "rgba(34,197,94,0.1)", icon: CheckCircle2 },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: stat.bg }}>
              <Icon className="h-4 w-4" style={{ color: stat.color }} />
              <span className="font-mono text-lg font-semibold" style={{ color: stat.color }}>{stat.count}</span>
              <span className="text-xs text-[#6B5B50]">{stat.label}</span>
            </div>
          );
        })}
        <div className="ml-auto shrink-0 self-center text-xs text-[#4A3828]">
          {active.length === 1 ? t("activeOrdersOne") : t("activeOrders", { count: active.length })}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-3 sm:px-6">
        {[
          { id: "active" as const, label: t("allActive"), icon: ChefHat },
          { id: "history" as const, label: t("orderHistory"), icon: History },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className="interactive flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium"
            style={{
              background: view === id ? "var(--primary)" : "rgba(255,255,255,0.04)",
              color: view === id ? "#fff" : "#6B5B50",
              border: `1px solid ${view === id ? "var(--primary)" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {view === "history" ? (
        <OrderHistoryPanel menuItems={menuItems} currency={currency} dark />
      ) : (
        <>
      <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-3 sm:px-6">
        {[
          { id: "all", label: t("allActive"), count: active.length },
          { id: "pending", label: t("pending"), count: pendingCount },
          { id: "cooking", label: t("cooking"), count: cookingCount },
          { id: "ready", label: t("ready"), count: readyCount },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
            style={{
              background: filter === f.id ? "var(--primary)" : "rgba(255,255,255,0.04)",
              color: filter === f.id ? "#fff" : "#6B5B50",
              border: `1px solid ${filter === f.id ? "var(--primary)" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {f.label}
            {f.id !== "all" && <span className="ml-1.5 rounded-full bg-white/10 px-1.5">{f.count}</span>}
          </button>
        ))}
      </div>

      <div className="grid flex-1 gap-4 overflow-auto p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-[#4A3828]">
            <CheckCircle2 className="mb-2 h-12 w-12" />
            {t("noOrders")}
          </div>
        ) : (
          filtered
            .sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime())
            .map((order) => {
              const sc = statusColor[order.status] ?? statusColor.pending;
              const action = nextAction[order.status];
              const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
              const borderColor =
                order.status === "ready"
                  ? "rgba(34,197,94,0.3)"
                  : order.status === "cooking"
                    ? "rgba(59,130,246,0.2)"
                    : "rgba(245,158,11,0.2)";

              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-2xl border p-4"
                  style={{ background: "#1C1410", borderColor }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-lg font-bold">
                        {order.tableNumber ? `T${order.tableNumber}` : t("web")}
                      </span>
                      {order.source === "online" && (
                        <span className="rounded bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-300">{t("online")}</span>
                      )}
                      {(order.source === "online" || order.source === "qr-menu") && order.fulfillmentType && order.fulfillmentType !== "dine-in" && (
                        <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-300">
                          {tFulfillment(order.fulfillmentType as "delivery" | "pickup")}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-xs font-bold tracking-wider" style={{ background: sc.bg, color: sc.text }}>
                      {tOrder(sc.labelKey)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#4A3828]">#{order.id.slice(-6).toUpperCase()}</span>
                    <ElapsedTime placedAt={order.placedAt} />
                  </div>
                  <OrderItemsGrouped items={order.items} menuItems={menuItems} currency={currency} dark compact showPrices={false} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B5B50]">{t("items", { count: totalItems })}</span>
                    {action && (
                      <button
                        type="button"
                        onClick={() => void updateOrder(order.id, { status: action.next })}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: action.btnBg }}
                      >
                        {action.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
        </>
      )}
    </div>
  );
}
