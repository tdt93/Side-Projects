"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChefHat,
  ChevronRight,
  DollarSign,
  Gift,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Printer,
  QrCode,
  Receipt,
  Settings,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CashierDashboard } from "@/components/dashboard/CashierDashboard";
import { InventorySection } from "@/components/dashboard/InventorySection";
import { KitchenDashboard } from "@/components/dashboard/KitchenDashboard";
import { LocationsSection } from "@/components/dashboard/LocationsSection";
import { LoyaltySection } from "@/components/dashboard/LoyaltySection";
import { MenuSection } from "@/components/dashboard/MenuSection";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { LocationSelector } from "@/components/layout/LocationSelector";
import { AppSelect } from "@/components/ui/AppSelect";
import { SectionTransition } from "@/components/ui/SectionTransition";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import {
  CHART_COLORS,
} from "@/lib/analytics-data";
import type { AnalyticsPayload } from "@/lib/analytics-server";
import { formatMoney } from "@/lib/currency";

type Section = "overview" | "analytics" | "menu" | "locations" | "loyalty" | "inventory" | "qr" | "settings" | "kitchen" | "cashier";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ElementType;
  delay?: number;
}) {
  return (
    <div
      className="stat-card flex flex-col gap-3 p-5 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="stat-card-icon flex h-10 w-10 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-green-600" />
      </div>
      <div>
        <div className="font-mono text-2xl font-bold text-foreground">{value}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
      </div>
      <div className="text-xs font-semibold text-green-600">{sub}</div>
    </div>
  );
}

function orderStatusStyle(status: string) {
  if (status === "ready") return { bg: "rgba(34,197,94,0.1)", color: "#16A34A" };
  if (status === "cooking") return { bg: "rgba(59,130,246,0.1)", color: "#3B82F6" };
  return { bg: "rgba(245,158,11,0.1)", color: "#D97706" };
}

export function OwnerDashboard({ onLogout }: { onLogout: () => void }) {
  const t = useTranslations("owner");
  const tOrder = useTranslations("orderStatus");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const {
    tenant,
    settings,
    orders,
    tables,
    locations,
    activeLocationId,
    viewAllLocations,
  } = useRestaurant();

  const currency = settings?.currency ?? "PLN";
  const [section, setSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<"day" | "month" | "year">("month");
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [overviewAnalytics, setOverviewAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [qrLocId, setQrLocId] = useState("");
  const [qrData, setQrData] = useState<{ url: string; png: string } | null>(null);

  function navigate(id: Section) {
    setSection(id);
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (locations[0] && !qrLocId) setQrLocId(locations[0].id);
  }, [locations, qrLocId]);

  useEffect(() => {
    if (!qrLocId || section !== "qr") return;
    void fetch(`/api/locations/${qrLocId}/qr`).then((r) => r.json()).then(setQrData);
  }, [qrLocId, section]);

  useEffect(() => {
    if (section !== "overview") return;
    void fetch("/api/analytics?range=day")
      .then((r) => r.json())
      .then(setOverviewAnalytics)
      .catch(() => setOverviewAnalytics(null));
  }, [section, activeLocationId]);

  useEffect(() => {
    if (section !== "analytics") return;
    setAnalyticsLoading(true);
    void fetch(`/api/analytics?range=${analyticsRange}`)
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setAnalyticsLoading(false));
  }, [section, analyticsRange, activeLocationId]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const activeOrders = orders.filter((o) => !["paid", "served"].includes(o.status));
  const occupied = tables.filter((tb) => tb.status === "occupied").length;
  const paidRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + o.items.reduce((a, i) => a + i.priceGrosze * i.quantity, 0), 0);
  const todayRevenue = paidRevenue + (overviewAnalytics?.trend.at(-1)?.revenue ?? 0);

  const analyticsTrend = analytics?.trend ?? [];
  const totalRevenue = analytics?.totals.revenue ?? 0;
  const totalOrders = analytics?.totals.orders ?? 0;
  const avgPerOrder = analytics?.totals.avgOrder ?? 0;
  const topDishesChart = analytics?.topDishes ?? [];
  const peakHoursChart = analytics?.peakHours ?? [];
  const peakHoursMonth = analytics?.peakHoursMonth ?? "";
  const revenueByCategoryChart = analytics?.revenueByCategory ?? [];
  const overviewTrend = overviewAnalytics?.trend.slice(-7) ?? [];
  const overviewTopDishes = overviewAnalytics?.topDishes.slice(0, 5) ?? [];

  const navMain: { id: Section; label: string; icon: ElementType }[] = [
    { id: "overview", label: t("overview"), icon: LayoutDashboard },
    { id: "analytics", label: t("analytics"), icon: BarChart3 },
    { id: "menu", label: t("menu"), icon: UtensilsCrossed },
    { id: "locations", label: t("locations"), icon: MapPin },
    { id: "loyalty", label: t("loyalty"), icon: Gift },
    { id: "inventory", label: t("inventory"), icon: Package },
    { id: "qr", label: t("qr"), icon: QrCode },
    { id: "settings", label: t("settings"), icon: Settings },
  ];

  const navStaff: { id: Section; label: string; icon: ElementType }[] = [
    { id: "kitchen", label: t("kitchenView"), icon: ChefHat },
    { id: "cashier", label: t("cashierView"), icon: Receipt },
  ];

  const chartTooltipStyle = {
    borderRadius: 12,
    border: "1px solid rgba(28,20,16,0.08)",
    fontSize: 12,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#1C1410] text-[#F5EDE4] transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              {tenant?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt="" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <Layers className="h-4 w-4 text-white" />
              )}
            </div>
            <div>
              <div className="font-serif text-sm leading-tight text-[#FAFAF7]">{tenant?.displayName ?? tCommon("productName")}</div>
              <div className="text-[0.65rem] uppercase tracking-wider text-[#6B5B50]">{tCommon("ownerPanel")}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-auto p-3">
          {navMain.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200"
              style={{
                background: section === id ? "var(--primary)" : "transparent",
                color: section === id ? "#fff" : "#8A7060",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={section === id ? "font-semibold" : "font-normal"}>{label}</span>
            </button>
          ))}

          <p className="mb-1 mt-5 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[#4A3828]">{t("staffViews")}</p>
          {navStaff.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm"
              style={{
                background: section === id ? "rgba(196,98,45,0.15)" : "transparent",
                color: section === id ? "#E07540" : "#6B5B50",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={section === id ? "font-semibold" : "font-normal"}>{label}</span>
              {id === "kitchen" && pendingCount > 0 && (
                <span className="ml-auto rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold text-white" style={{ background: "var(--primary)" }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[#6B5B50] hover:text-[#A89080]">
            <LogOut className="h-4 w-4" />
            {tCommon("logoutStaff")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg border border-border p-2">
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate font-serif text-sm">{tenant?.displayName ?? tCommon("productName")}</span>
        </div>

      <main className="flex-1 overflow-auto bg-[#FAFAF7] dark:bg-background">
        {section !== "kitchen" && section !== "cashier" && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("ownerBreadcrumb")}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-xs font-semibold text-foreground">
                {[...navMain, ...navStaff].find((n) => n.id === section)?.label}
              </span>
            </div>
            <LocationSelector compact />
          </div>
        )}

        {section === "overview" && (
          <SectionTransition sectionKey="overview">
          <div className="space-y-6 p-6 animate-section-in">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-2xl text-foreground">{t("goodAfternoon", { name: tenant?.displayName ?? "" })}</h1>
                <p className="text-sm text-muted-foreground">
                  {viewAllLocations ? t("dashboardSubtitleAll") : t("dashboardSubtitleBranch", { name: locations.find((l) => l.id === activeLocationId)?.name ?? "" })}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("todayRevenue")} value={formatMoney(todayRevenue, currency)} sub={t("revenueVsYesterday")} icon={DollarSign} delay={0} />
              <StatCard label={t("activeOrders")} value={String(activeOrders.length)} sub={t("pendingCount", { count: pendingCount })} icon={ShoppingBag} delay={50} />
              <StatCard label={t("tablesOccupied")} value={`${occupied}/${tables.length}`} sub={t("availableTables", { count: tables.filter((tb) => tb.status === "available").length })} icon={UtensilsCrossed} delay={100} />
              <StatCard label={t("avgOrder")} value={formatMoney(overviewAnalytics?.totals.avgOrder ?? 0, currency)} sub={t("weekGrowth")} icon={TrendingUp} delay={150} />
            </div>

            <div className="dashboard-card p-5">
              <h3 className="mb-4 text-sm font-medium text-foreground">{t("revenueLast7Days")}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={overviewTrend}>
                  <defs>
                    <linearGradient id="revGradOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4622D" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#C4622D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,20,16,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A7060" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A7060" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(1)}k`} />
                  <Tooltip
                    formatter={(v, name) => [
                      name === "orders" ? Number(v ?? 0) : formatMoney(Number(v ?? 0), currency),
                      name === "orders" ? t("totalOrders") : t("revenue"),
                    ]}
                    contentStyle={chartTooltipStyle}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#C4622D" strokeWidth={2} fill="url(#revGradOverview)" activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} dot={false} yAxisId={undefined} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="dashboard-card p-5">
                <h3 className="mb-3 text-sm font-medium">{t("topDishes")}</h3>
                <div className="space-y-2">
                  {overviewTopDishes.map((dish, i) => (
                    <div key={dish.name} className="flex items-center gap-3">
                      <span className="min-w-4 font-mono text-xs text-muted-foreground/70">#{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{dish.name}</div>
                        <div className="text-xs text-muted-foreground">{t("ordersCount", { count: dish.orders })}</div>
                      </div>
                      <span className="font-mono text-sm font-semibold text-primary">{formatMoney(dish.revenue, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dashboard-card p-5">
                <h3 className="mb-3 text-sm font-medium">{t("liveOrders")}</h3>
                <div className="space-y-2">
                  {activeOrders.slice(0, 5).map((order) => {
                    const st = orderStatusStyle(order.status);
                    return (
                      <div key={order.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-semibold">
                            {order.tableNumber ? tCommon("table", { number: order.tableNumber }) : t("onlineOrder")}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">{t("itemsCount", { count: order.items.length })}</span>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase" style={{ background: st.bg, color: st.color }}>
                          {tOrder(order.status as "pending" | "cooking" | "ready" | "served" | "paid")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </SectionTransition>
        )}

        {section === "analytics" && (
          <SectionTransition sectionKey="analytics">
          <div className="space-y-6 p-6 animate-section-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-2xl">{t("analytics")}</h1>
                <p className="text-sm text-muted-foreground">{t("analyticsSubtitle")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {analyticsLoading && <span className="text-xs text-muted-foreground">{tCommon("loading")}</span>}
                <div className="flex gap-1 rounded-xl bg-muted p-1">
                {(["day", "month", "year"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAnalyticsRange(r)}
                    className="interactive rounded-lg px-4 py-1.5 text-sm font-medium capitalize"
                    style={{
                      background: analyticsRange === r ? "var(--primary)" : "transparent",
                      color: analyticsRange === r ? "#fff" : undefined,
                    }}
                  >
                    {r === "day" ? t("daily") : r === "month" ? t("monthly") : t("yearly")}
                  </button>
                ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: t("totalRevenue"), val: formatMoney(totalRevenue, currency), icon: DollarSign, delay: 0 },
                { label: t("totalOrders"), val: totalOrders.toLocaleString(), icon: ShoppingBag, delay: 50 },
                { label: t("avgPerOrder"), val: formatMoney(avgPerOrder, currency), icon: TrendingUp, delay: 100 },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="stat-card flex items-center gap-3 p-4 animate-fade-in" style={{ animationDelay: `${c.delay}ms` }}>
                    <div className="stat-card-icon flex h-10 w-10 items-center justify-center rounded-xl">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-lg font-bold">{c.val}</div>
                      <div className="text-xs text-muted-foreground">{c.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="dashboard-card p-5">
              <h3 className="mb-4 text-sm font-medium">{t("revenueTrend")}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={analyticsTrend}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4622D" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C4622D" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,20,16,0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A7060" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#8A7060" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#8A7060" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v, name) => [
                      name === "orders" ? Number(v ?? 0) : formatMoney(Number(v ?? 0), currency),
                      name === "revenue" ? t("revenue") : name === "profit" ? t("profit") : t("totalOrders"),
                    ]}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#C4622D" strokeWidth={2} fill="url(#revGrad2)" name={t("revenue")} activeDot={{ r: 5 }} />
                  {analyticsTrend[0]?.profit != null && (
                    <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#16A34A" strokeWidth={2} fill="url(#profitGrad)" name={t("profit")} />
                  )}
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name={t("totalOrders")} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="dashboard-card p-5">
                <h3 className={`text-sm font-medium ${peakHoursMonth ? "mb-1" : "mb-4"}`}>{t("peakHours")}</h3>
                {peakHoursMonth && (
                  <p className="mb-4 text-xs text-muted-foreground">{t("peakHoursThisMonth", { month: peakHoursMonth })}</p>
                )}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={peakHoursChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,20,16,0.05)" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#8A7060" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(196,98,45,0.08)" }} />
                    <Bar dataKey="orders" fill="#C4622D" radius={[4, 4, 0, 0]} activeBar={{ fill: "#E07A3A" }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="dashboard-card p-5">
                <h3 className="mb-4 text-sm font-medium">{t("revenueByCategory")}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={revenueByCategoryChart} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={72} innerRadius={42}>
                      {revenueByCategoryChart.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatMoney(Number(v ?? 0), currency)} contentStyle={chartTooltipStyle} />
                    <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-card p-5">
              <h3 className="mb-4 text-sm font-medium">{t("topDishesByOrders")}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topDishesChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,20,16,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8A7060" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8A7060" }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v, name) => [
                      name === "revenue" ? formatMoney(Number(v ?? 0), currency) : Number(v ?? 0),
                      name === "revenue" ? t("revenue") : t("totalOrders"),
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="orders" fill="#F59E0B" radius={[0, 4, 4, 0]} name={t("totalOrders")} activeBar={{ fill: "#FBBF24" }} />
                  <Bar dataKey="revenue" fill="#C4622D" radius={[0, 4, 4, 0]} name={t("revenue")} activeBar={{ fill: "#E07A3A" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </SectionTransition>
        )}

        {section === "menu" && (
          <SectionTransition sectionKey="menu">
            <MenuSection />
          </SectionTransition>
        )}

        {section === "locations" && (
          <SectionTransition sectionKey="locations">
            <LocationsSection />
          </SectionTransition>
        )}

        {section === "loyalty" && (
          <SectionTransition sectionKey="loyalty">
            <LoyaltySection />
          </SectionTransition>
        )}

        {section === "inventory" && (
          <SectionTransition sectionKey="inventory">
            <InventorySection />
          </SectionTransition>
        )}

        {section === "qr" && (
          <SectionTransition sectionKey="qr">
          <div className="space-y-5 p-4 sm:p-6 animate-section-in">
            <div>
              <h1 className="font-serif text-2xl">{t("qr")}</h1>
              <p className="text-sm text-muted-foreground">{t("qrSubtitle")}</p>
            </div>
            <div className="max-w-md">
              <AppSelect
                label={t("selectLocation")}
                value={qrLocId}
                onChange={(e) => setQrLocId(e.target.value)}
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </AppSelect>
              {qrData && (
                <div className="dashboard-card mt-5 flex flex-col items-center gap-4 p-6 text-center">
                  <div className="rounded-2xl bg-white p-4 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrData.png} alt={t("qrAlt")} className="h-48 w-48" />
                  </div>
                  <p className="font-semibold">{locations.find((l) => l.id === qrLocId)?.name}</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">{qrData.url}</p>
                  <div className="flex w-full flex-col gap-3 sm:flex-row">
                    <a href={qrData.png} download="menu-qr.png" className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm">
                      <QrCode className="h-4 w-4" /> {t("downloadPng")}
                    </a>
                    <button type="button" onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                      <Printer className="h-4 w-4" /> {t("print")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </SectionTransition>
        )}

        {section === "settings" && (
          <SectionTransition sectionKey="settings">
          <div className="max-w-2xl p-4 sm:p-6">
            <div className="mb-4">
              <h1 className="font-serif text-2xl">{t("settings")}</h1>
              <p className="text-sm text-muted-foreground">{t("settingsSubtitle")}</p>
            </div>
            <SettingsPanel />
          </div>
          </SectionTransition>
        )}

        {section === "kitchen" && (
          <div className="min-h-[400px] sm:min-h-[600px]"><KitchenDashboard embedded /></div>
        )}
        {section === "cashier" && (
          <div className="min-h-[400px] sm:min-h-[600px]"><CashierDashboard embedded /></div>
        )}
      </main>
      </div>
    </div>
  );
}
