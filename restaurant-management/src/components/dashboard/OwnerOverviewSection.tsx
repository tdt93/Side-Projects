"use client";

import { useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ChefHat,
  Clock,
  CreditCard,
  DollarSign,
  QrCode,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import type { OwnerOverviewPayload, OverviewOrderRow } from "@/lib/owner-overview";
import type { AnalyticsPayload } from "@/lib/analytics-server";
import { formatMoney } from "@/lib/currency";

type NavigateTarget = "overview" | "analytics" | "menu" | "kitchen" | "cashier";

type Props = {
  currency: string;
  tenantName: string;
  viewAllLocations: boolean;
  branchName: string;
  onNavigate: (target: NavigateTarget) => void;
};

type TileId = "revenue" | "orders" | "tables" | "kitchen";

const TILE_TITLES: Record<TileId, string> = {
  orders: "activeOrders",
  tables: "tablesOccupied",
  revenue: "todayRevenue",
  kitchen: "kitchenOps",
};

function ClickableStatCard({
  tileId,
  selected,
  onSelect,
  onNavigate,
  label,
  value,
  hint,
  actionLabel,
  navigateTarget,
  icon: Icon,
  accent,
  delay,
}: {
  tileId: TileId;
  selected: boolean;
  onSelect: (id: TileId) => void;
  onNavigate: (target: NavigateTarget) => void;
  label: string;
  value: string;
  hint: string;
  actionLabel: string;
  navigateTarget: NavigateTarget;
  icon: ElementType;
  accent: string;
  delay: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tileId)}
      className="stat-card interactive group w-full animate-fade-in p-5 text-left transition-all hover:ring-2 hover:ring-primary/25"
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: selected ? "0 0 0 2px var(--primary)" : undefined,
      }}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="stat-card-icon flex h-10 w-10 items-center justify-center rounded-xl" style={{ color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
        <span
          role="link"
          tabIndex={0}
          className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[0.65rem] font-semibold text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(navigateTarget);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onNavigate(navigateTarget);
            }
          }}
        >
          {actionLabel}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
      <div className="mt-3">
        <div className="font-mono text-2xl font-bold text-foreground">{value}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-xs font-medium text-primary/80">{hint}</div>
      </div>
    </button>
  );
}

function OrderMiniList({
  rows,
  t,
  tCommon,
  tFulfillment,
  showLocation,
}: {
  rows: OverviewOrderRow[];
  t: (key: string, values?: Record<string, string | number>) => string;
  tCommon: (key: string, values?: Record<string, string | number>) => string;
  tFulfillment: (key: string) => string;
  showLocation: boolean;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t("noItems")}</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium">
              {row.tableNumber ? tCommon("table", { number: row.tableNumber }) : row.customerName ?? t("onlineOrder")}
              {showLocation && row.locationName ? ` · ${row.locationName}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {tFulfillment(row.fulfillmentType as "dine-in" | "delivery" | "pickup")} · {row.elapsedMinutes}m
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-bold uppercase">{row.status}</span>
        </div>
      ))}
    </div>
  );
}

function TableMiniList({
  rows,
  t,
  tCommon,
}: {
  rows: OwnerOverviewPayload["tables"]["serviceRequests"];
  t: (key: string, values?: Record<string, string | number>) => string;
  tCommon: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t("noItems")}</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
          <div>
            <p className="font-medium">
              {row.name ? `${row.name} (${tCommon("table", { number: row.number })})` : tCommon("table", { number: row.number })}
            </p>
            <p className="text-xs text-muted-foreground">{row.locationName}</p>
          </div>
          {row.occupiedMinutes != null && (
            <span className="text-xs font-mono text-muted-foreground">{row.occupiedMinutes}m</span>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md animate-slide-in-right flex-col border-l border-border bg-card shadow-2xl sm:max-w-lg"
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-serif text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="interactive rounded-lg p-1.5 hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}

export function OwnerOverviewSection({ currency, tenantName, viewAllLocations, branchName, onNavigate }: Props) {
  const t = useTranslations("owner");
  const tCommon = useTranslations("common");
  const tOrder = useTranslations("orderStatus");
  const tFulfillment = useTranslations("orderFulfillment");
  const { activeLocationId } = useRestaurant();
  const [overview, setOverview] = useState<OwnerOverviewPayload | null>(null);
  const [chartData, setChartData] = useState<AnalyticsPayload | null>(null);
  const [expanded, setExpanded] = useState<TileId | null>(null);

  useEffect(() => {
    void fetch("/api/owner/overview")
      .then((r) => r.json())
      .then(setOverview)
      .catch(() => setOverview(null));
    void fetch("/api/analytics?range=day")
      .then((r) => r.json())
      .then(setChartData)
      .catch(() => setChartData(null));
  }, [activeLocationId]);

  const trend = chartData?.trend.slice(-7) ?? [];

  function renderPanelContent(id: TileId): ReactNode {
    if (!overview) return null;
    switch (id) {
      case "orders":
        return (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600">
                {t("newOrders")} ({overview.orders.newToday})
              </p>
              <OrderMiniList rows={overview.orders.newList} t={t} tCommon={tCommon} tFulfillment={tFulfillment} showLocation={viewAllLocations} />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">
                {t("lateOrders")} ({overview.orders.late})
              </p>
              <OrderMiniList rows={overview.orders.lateList} t={t} tCommon={tCommon} tFulfillment={tFulfillment} showLocation={viewAllLocations} />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("cancelledOrders")} ({overview.orders.cancelled})
              </p>
              <OrderMiniList rows={overview.orders.cancelledList} t={t} tCommon={tCommon} tFulfillment={tFulfillment} showLocation={viewAllLocations} />
            </div>
          </div>
        );
      case "tables":
        return (
          <div className="space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-blue-600">
                <Bell className="h-3.5 w-3.5" /> {t("serviceRequests")} ({overview.tables.serviceRequests.length})
              </p>
              <TableMiniList rows={overview.tables.serviceRequests} t={t} tCommon={tCommon} />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-violet-600">
                <QrCode className="h-3.5 w-3.5" /> {t("qrGuests")} ({overview.tables.qrActive.length})
              </p>
              <TableMiniList rows={overview.tables.qrActive} t={t} tCommon={tCommon} />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                <Clock className="h-3.5 w-3.5" /> {t("longOccupancy")} ({overview.tables.longOccupancy.length})
              </p>
              <TableMiniList rows={overview.tables.longOccupancy} t={t} tCommon={tCommon} />
            </div>
          </div>
        );
      case "revenue":
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("revenueByOrderType")}</p>
            {overview.revenue.byFulfillment.map((row) => (
              <div key={row.type} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
                <span>{tFulfillment(row.type as "dine-in" | "delivery" | "pickup")}</span>
                <span className="font-mono font-semibold">
                  {formatMoney(row.revenue, currency)} · {row.orders} {t("ordersShort")}
                </span>
              </div>
            ))}
          </div>
        );
      case "kitchen":
        return (
          <div className="space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-orange-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {t("slowKitchen")} ({overview.kitchen.slow})
              </p>
              <OrderMiniList rows={overview.kitchen.slowList} t={t} tCommon={tCommon} tFulfillment={tFulfillment} showLocation={viewAllLocations} />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-red-600">
                <CreditCard className="h-3.5 w-3.5" /> {t("unpaidOrders")} ({overview.payments.unpaid})
              </p>
              <OrderMiniList rows={overview.payments.unpaidList} t={t} tCommon={tCommon} tFulfillment={tFulfillment} showLocation={viewAllLocations} />
              <p className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-sm">
                {t("avgServeTime")}: <span className="font-mono font-bold">{overview.kitchen.avgServeMinutes}m</span>
              </p>
            </div>
          </div>
        );
    }
  }

  if (!overview) {
    return <div className="p-6 text-sm text-muted-foreground">{tCommon("loading")}</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 animate-section-in">
      <div>
        <h1 className="font-serif text-2xl text-foreground">{t("goodAfternoon", { name: tenantName })}</h1>
        <p className="text-sm text-muted-foreground">
          {viewAllLocations ? t("dashboardSubtitleAll") : t("dashboardSubtitleBranch", { name: branchName })}
        </p>
      </div>

      <div className="relative">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ClickableStatCard
            tileId="orders"
            selected={expanded === "orders"}
            onSelect={(id) => setExpanded((p) => (p === id ? null : id))}
            onNavigate={onNavigate}
            label={t("activeOrders")}
            value={String(overview.orders.active)}
            hint={t("tileOrdersHint", { new: overview.orders.newToday, late: overview.orders.late, cancelled: overview.orders.cancelled })}
            actionLabel={t("viewOrders")}
            navigateTarget="kitchen"
            icon={ShoppingBag}
            accent="#D97706"
            delay={0}
          />
          <ClickableStatCard
            tileId="tables"
            selected={expanded === "tables"}
            onSelect={(id) => setExpanded((p) => (p === id ? null : id))}
            onNavigate={onNavigate}
            label={t("tablesOccupied")}
            value={`${overview.tables.occupied}/${overview.tables.total}`}
            hint={t("tileTablesHint", {
              available: overview.tables.available,
              service: overview.tables.serviceRequests.length,
              qr: overview.tables.qrActive.length,
            })}
            actionLabel={t("viewFloorPlan")}
            navigateTarget="cashier"
            icon={UtensilsCrossed}
            accent="#2563EB"
            delay={50}
          />
          <ClickableStatCard
            tileId="revenue"
            selected={expanded === "revenue"}
            onSelect={(id) => setExpanded((p) => (p === id ? null : id))}
            onNavigate={onNavigate}
            label={t("todayRevenue")}
            value={formatMoney(overview.revenue.today, currency)}
            hint={t("tileRevenueHint", { served: overview.tables.servedToday })}
            actionLabel={t("viewReport")}
            navigateTarget="analytics"
            icon={DollarSign}
            accent="#16A34A"
            delay={100}
          />
          <ClickableStatCard
            tileId="kitchen"
            selected={expanded === "kitchen"}
            onSelect={(id) => setExpanded((p) => (p === id ? null : id))}
            onNavigate={onNavigate}
            label={t("kitchenOps")}
            value={String(overview.kitchen.slow)}
            hint={t("tileKitchenHint", { avg: overview.kitchen.avgServeMinutes, unpaid: overview.payments.unpaid })}
            actionLabel={t("viewKitchen")}
            navigateTarget="kitchen"
            icon={ChefHat}
            accent="#C4622D"
            delay={150}
          />
        </div>

        {expanded && (
          <DetailPanel title={t(TILE_TITLES[expanded])} onClose={() => setExpanded(null)}>
            {renderPanelContent(expanded)}
          </DetailPanel>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <button type="button" onClick={() => onNavigate("analytics")} className="dashboard-card interactive p-4 text-left hover:ring-2 hover:ring-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t("avgOrder")}</p>
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold">{formatMoney(chartData?.totals.avgOrder ?? 0, currency)}</p>
          <p className="mt-1 text-xs text-primary">{t("openAnalytics")}</p>
        </button>
        <button type="button" onClick={() => onNavigate("cashier")} className="dashboard-card interactive p-4 text-left hover:ring-2 hover:ring-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t("servedTablesToday")}</p>
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold">{overview.tables.servedToday}</p>
          <p className="mt-1 text-xs text-primary">{t("openFloorPlan")}</p>
        </button>
        <button type="button" onClick={() => onNavigate("menu")} className="dashboard-card interactive p-4 text-left hover:ring-2 hover:ring-primary/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t("topDishes")}</p>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 truncate text-sm font-semibold">{chartData?.topDishes[0]?.name ?? "—"}</p>
          <p className="mt-1 text-xs text-primary">{t("openMenuInventory")}</p>
        </button>
      </div>

      <div className="dashboard-card p-5">
        <h3 className="mb-4 text-sm font-medium text-foreground">{t("revenueLast7Days")}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,20,16,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A7060" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#8A7060" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}k`} />
            <Tooltip formatter={(v) => formatMoney(Number(v ?? 0), currency)} />
            <Area type="monotone" dataKey="revenue" stroke="#C4622D" strokeWidth={2} fill="rgba(196,98,45,0.12)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="dashboard-card p-5">
        <h3 className="mb-3 text-sm font-medium">{t("liveOrders")}</h3>
        <div className="space-y-2">
          {overview.orders.newList.slice(0, 5).map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2">
              <div className="min-w-0 text-sm">
                <span className="font-semibold">
                  {order.tableNumber ? tCommon("table", { number: order.tableNumber }) : t("onlineOrder")}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {tFulfillment(order.fulfillmentType as "dine-in" | "delivery" | "pickup")} · {order.source}
                </span>
              </div>
              <span className="shrink-0 text-xs font-bold uppercase text-muted-foreground">{tOrder(order.status as "pending")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
