"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  Globe,
  History,
  LogOut,
  Minus,
  Plus,
  Receipt,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { OrderHistoryPanel } from "@/components/dashboard/OrderHistoryPanel";
import { OrderItemsGrouped } from "@/components/dashboard/OrderItemsGrouped";
import { AppSelect } from "@/components/ui/AppSelect";
import { addMinutesToIso, AppDateTimePicker, formatReservationRange } from "@/components/ui/AppDateTimePicker";
import { LocationSelector } from "@/components/layout/LocationSelector";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import { formatMoney, taxFromSubtotal } from "@/lib/currency";
import { CATEGORY_I18N_KEYS } from "@/lib/menu-categories";
import { groupItemsByCategory } from "@/lib/order-display";

const TABLE_STATUS: Record<string, { bg: string; border: string; text: string }> = {
  available: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#86EFAC" },
  occupied: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#FCD34D" },
  reserved: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "#93C5FD" },
};

export function CashierDashboard({ embedded = false, onLogout }: { embedded?: boolean; onLogout?: () => void }) {
  const t = useTranslations("cashier");
  const tTable = useTranslations("tableStatus");
  const tCommon = useTranslations("common");
  const tFulfillment = useTranslations("orderFulfillment");
  const { tenant, settings, menuItems, orders, tables, reservations, activeLocationId, viewAllLocations, updateOrder, addOrder, payOrder, addReservation, deleteReservation, updateTable } = useRestaurant();
  const currency = settings?.currency ?? "PLN";
  const taxRate = (settings?.taxRateBps ?? 800) / 100;

  const [tab, setTab] = useState<"tables" | "online" | "history">("tables");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showReserve, setShowReserve] = useState(false);
  const [showReservationDetails, setShowReservationDetails] = useState(true);
  const [reserveName, setReserveName] = useState("");
  const [reservePhone, setReservePhone] = useState("");
  const [reserveStart, setReserveStart] = useState("");
  const [reserveDuration, setReserveDuration] = useState("90");
  const [reserveNotes, setReserveNotes] = useState("");

  const visibleTables = useMemo(() => {
    if (activeLocationId) return tables.filter((tb) => tb.locationId === activeLocationId);
    return tables;
  }, [tables, activeLocationId]);

  useEffect(() => {
    setSelectedTableId(null);
    setShowAdd(false);
    setShowBill(false);
  }, [activeLocationId]);

  const table = visibleTables.find((tb) => tb.id === selectedTableId) ?? tables.find((tb) => tb.id === selectedTableId);

  const scopedMenuItems = useMemo(() => {
    const locId = table?.locationId ?? activeLocationId;
    if (!locId) return menuItems.filter((m) => m.available);
    return menuItems.filter(
      (m) => m.available && (m.isShared || !m.locationId || m.locationId === locId),
    );
  }, [menuItems, table?.locationId, activeLocationId]);

  const order = table?.orderId ? orders.find((o) => o.id === table.orderId) : null;
  const onlineOrders = orders.filter((o) => ["online", "qr-menu"].includes(o.source) && o.status !== "paid");

  const tableReservations = useMemo(() => {
    if (!table) return [];
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);
    return reservations
      .filter(
        (r) =>
          r.locationId === table.locationId &&
          r.tableNumber === table.number &&
          new Date(r.startsAt) <= dayEnd &&
          new Date(r.endsAt) >= dayStart,
      )
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [reservations, table]);

  const reservationCountByTable = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reservations) {
      const key = `${r.locationId}:${r.tableNumber}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [reservations]);

  const subtotal = order?.items.reduce((s, i) => s + i.priceGrosze * i.quantity, 0) ?? 0;
  const tax = taxFromSubtotal(subtotal, settings?.taxRateBps ?? 800);

  async function handleReserve() {
    if (!table || !reserveName.trim() || !reserveStart) return;
    const endsAt = addMinutesToIso(reserveStart, parseInt(reserveDuration, 10));
    await addReservation(table.number, {
      locationId: table.locationId,
      guestName: reserveName.trim(),
      guestPhone: reservePhone.trim() || undefined,
      startsAt: reserveStart,
      endsAt,
      notes: reserveNotes.trim() || undefined,
    });
    setShowReserve(false);
    setReserveName("");
    setReservePhone("");
    setReserveNotes("");
    setReserveStart("");
  }

  function openReserveModal() {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    setReserveStart(now.toISOString());
    setShowReserve(true);
  }

  async function handleNewOrder(tableNumber: number, locationId: string) {
    await addOrder({ tableNumber, locationId });
  }

  async function handleQty(menuItemId: string, delta: number) {
    if (!order) return;
    const updated = order.items
      .map((i) => (i.menuItemId === menuItemId ? { menuItemId: i.menuItemId, quantity: i.quantity + delta } : { menuItemId: i.menuItemId, quantity: i.quantity }))
      .filter((i) => i.quantity > 0);
    await updateOrder(order.id, { items: updated });
  }

  async function handleAddFromMenu(menuItemId: string, qty: number) {
    if (!order || qty <= 0) return;
    const existing = order.items.find((i) => i.menuItemId === menuItemId);
    const items = existing
      ? order.items.map((i) =>
          i.menuItemId === menuItemId
            ? { menuItemId: i.menuItemId, quantity: i.quantity + qty }
            : { menuItemId: i.menuItemId, quantity: i.quantity },
        )
      : [...order.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })), { menuItemId, quantity: qty }];
    await updateOrder(order.id, { items });
    setShowAdd(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0805] text-[#FAFAF7]">
      {!embedded && (
        <header className="flex items-center justify-between border-b border-white/10 bg-[#120D09] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg">{t("title")}</h2>
              <p className="text-xs text-[#6B5B50]">{tenant?.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LocationSelector dark compact />
            {onLogout && (
              <button type="button" onClick={onLogout} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#8A7060]">
                <LogOut className="h-3.5 w-3.5" /> {tCommon("logoutStaff")}
              </button>
            )}
          </div>
        </header>
      )}

      <div className="flex overflow-x-auto border-b border-white/10 bg-[#120D09] px-4 sm:px-6">
        {[
          { id: "tables" as const, label: t("tableView"), icon: UtensilsCrossed },
          { id: "online" as const, label: t("onlineOrders", { count: onlineOrders.length }), icon: Globe },
          { id: "history" as const, label: t("orderHistory"), icon: History },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
            style={{
              borderColor: tab === id ? "var(--primary)" : "transparent",
              color: tab === id ? "var(--accent)" : "#6B5B50",
            }}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "tables" ? (
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <aside className="w-full shrink-0 overflow-auto border-b border-white/10 bg-[#120D09] p-4 lg:w-72 lg:border-b-0 lg:border-r">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B5B50]">{t("floorPlan")}</h3>
            <div className="mb-4 flex gap-3 text-[0.65rem]">
              {Object.entries(TABLE_STATUS).map(([status, style]) => (
                <span key={status} className="flex items-center gap-1 capitalize" style={{ color: style.text }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: style.text }} />
                  {tTable(status as "available" | "occupied" | "reserved")}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {visibleTables.map((tb) => {
                const st = TABLE_STATUS[tb.status] ?? TABLE_STATUS.available;
                const isSelected = selectedTableId === tb.id;
                const reservationCount = reservationCountByTable.get(`${tb.locationId}:${tb.number}`) ?? 0;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setSelectedTableId(selectedTableId === tb.id ? null : tb.id)}
                    className="interactive relative flex aspect-square flex-col items-center justify-center rounded-xl border-2"
                    style={{
                      borderColor: isSelected ? "var(--primary)" : st.border,
                      background: isSelected ? "rgba(196,98,45,0.2)" : st.bg,
                      color: isSelected ? "#FAFAF7" : st.text,
                      boxShadow: isSelected ? "0 0 0 2px rgba(196,98,45,0.3)" : undefined,
                    }}
                  >
                    <span className="font-mono text-lg font-bold">{tb.name ?? tb.number}</span>
                    {tb.name && <span className="text-[0.55rem] opacity-70">#{tb.number}</span>}
                    <span className="text-[0.6rem] opacity-80">{tTable(tb.status as "available" | "occupied" | "reserved")}</span>
                    {tb.serviceRequestedAt && (
                      <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
                        <Bell className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {reservationCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[0.55rem] font-bold text-white">
                        {reservationCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex flex-1 flex-col bg-[#0D0805]">
            {table ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div>
                    <h3 className="font-serif text-lg">
                      {table.name ? `${table.name} (${tCommon("table", { number: table.number })})` : tCommon("table", { number: table.number })}
                    </h3>
                    <p className="text-xs text-[#6B5B50]">{table?.status ? tTable(table.status as "available" | "occupied" | "reserved") : "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!order && (
                      <button type="button" onClick={openReserveModal} className="interactive flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#D4C4B8]">
                        <CalendarClock className="h-3.5 w-3.5" /> {t("reserveTable")}
                      </button>
                    )}
                    {order && (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateTable(table.number, table.serviceRequestedAt ? { clearServiceRequest: true } : { requestService: true })}
                          className="interactive flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#D4C4B8]"
                        >
                          <Bell className="h-3.5 w-3.5" />
                          {table.serviceRequestedAt ? t("clearService") : t("callService")}
                        </button>
                        <button type="button" onClick={() => setShowAdd(true)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#D4C4B8]">
                          {t("addItem")}
                        </button>
                        <button
                          type="button"
                          disabled={!order.items.length}
                          onClick={() => setShowBill(true)}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                          style={{ background: "var(--primary)" }}
                        >
                          {t("bill")}
                        </button>
                      </>
                    )}
                    {!order && table.status === "available" && (
                      <button type="button" onClick={() => void handleNewOrder(table.number, table.locationId)} className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
                        {t("newOrder")}
                      </button>
                    )}
                  </div>
                </div>

                {tableReservations.length > 0 && (
                  <div className="border-b border-white/10 px-6 py-3">
                    <button
                      type="button"
                      onClick={() => setShowReservationDetails((v) => !v)}
                      className="interactive mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-[#6B5B50]"
                    >
                      {t("todaysReservations", { count: tableReservations.length })}
                      <span>{showReservationDetails ? "−" : "+"}</span>
                    </button>
                    {showReservationDetails && (
                      <div className="space-y-2">
                        {tableReservations.map((res) => {
                          const now = Date.now();
                          const active = new Date(res.startsAt).getTime() <= now && new Date(res.endsAt).getTime() > now;
                          return (
                            <div
                              key={res.id}
                              className="rounded-xl border border-white/10 bg-[#1C1410] p-3"
                              style={{ borderColor: active ? "rgba(59,130,246,0.35)" : undefined }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-[#FAFAF7]">{res.guestName}</p>
                                  <p className="text-xs text-[#93C5FD]">{formatReservationRange(res.startsAt, res.endsAt)}</p>
                                  {res.guestPhone && <p className="text-xs text-[#6B5B50]">{res.guestPhone}</p>}
                                  {res.notes && <p className="mt-1 text-xs text-[#A89080]">{res.notes}</p>}
                                  {active && (
                                    <span className="mt-1 inline-block rounded-full bg-blue-500/20 px-2 py-0.5 text-[0.6rem] font-bold text-blue-300">
                                      {t("activeNow")}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void deleteReservation(res.id)}
                                  className="interactive rounded-lg p-1.5 text-[#6B5B50] hover:bg-red-500/10 hover:text-red-400"
                                  title={t("cancelReservation")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-auto p-6">
                  {!order?.items.length ? (
                    <div className="flex h-full items-center justify-center text-[#4A3828]">{t("selectTable")}</div>
                  ) : (
                    <OrderItemsGrouped
                      items={order.items}
                      menuItems={menuItems}
                      currency={currency}
                      dark
                      action={(item) => (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => void handleQty(item.menuItemId, -1)} className="interactive rounded-lg bg-white/10 p-1 text-[#D4C4B8]">
                            <Minus className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => void handleQty(item.menuItemId, 1)} className="interactive rounded-lg p-1 text-white" style={{ background: "var(--primary)" }}>
                            <Plus className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => void handleQty(item.menuItemId, -item.quantity)} className="interactive text-[#6B5B50] hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    />
                  )}
                </div>
                {order && order.items.length > 0 && (
                  <div className="border-t border-white/10 bg-[#120D09] px-6 py-4 text-sm">
                    <div className="flex justify-between text-[#A89080]"><span>{t("subtotal")}</span><span className="font-mono">{formatMoney(subtotal, currency)}</span></div>
                    <div className="flex justify-between text-[#A89080]"><span>{t("tax", { rate: taxRate })}</span><span className="font-mono">{formatMoney(tax, currency)}</span></div>
                    <div className="mt-1 flex justify-between font-bold text-[#FAFAF7]"><span>{t("total")}</span><span className="font-mono" style={{ color: "var(--accent)" }}>{formatMoney(subtotal + tax, currency)}</span></div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-[#4A3828]">
                <UtensilsCrossed className="mb-2 h-12 w-12 opacity-40" />
                {t("selectTable")}
              </div>
            )}
          </div>
        </div>
      ) : tab === "online" ? (
        <div className="flex-1 overflow-auto p-6">
          {onlineOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#4A3828]">
              <Globe className="mb-2 h-12 w-12 opacity-40" />
              {t("noOnlineOrders")}
            </div>
          ) : (
            onlineOrders.map((o) => (
              <div key={o.id} className="mb-3 rounded-2xl border border-white/10 bg-[#1C1410] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#FAFAF7]">{o.customerName ?? tCommon("guest")}</p>
                    {(o.source === "online" || o.source === "qr-menu") && o.fulfillmentType && o.fulfillmentType !== "dine-in" && (
                      <span className="mt-1 inline-block rounded-full bg-violet-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-violet-300">
                        {tFulfillment(o.fulfillmentType as "delivery" | "pickup")}
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-300">{tCommon("online")}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {o.items.map((i) => (
                    <div key={i.menuItemId} className="flex justify-between text-sm text-[#D4C4B8]">
                      <span>{i.name} ×{i.quantity}</span>
                      <span className="font-mono">{formatMoney(i.priceGrosze * i.quantity, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  {o.status === "pending" && (
                    <button type="button" onClick={() => void updateOrder(o.id, { status: "cooking" })} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
                      {t("acceptOrder")}
                    </button>
                  )}
                  {o.status === "ready" && (
                    <button
                      type="button"
                      onClick={() => void payOrder(o.id, { tipGrosze: 0, method: "online" })}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {t("markDelivered")}
                    </button>
                  )}
                  {(o.status === "pending" && o.source === "qr-menu") && (
                    <button
                      type="button"
                      onClick={() => void payOrder(o.id, { tipGrosze: 0, method: "qr" })}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {t("collectPayment")}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <OrderHistoryPanel menuItems={menuItems} currency={currency} dark />
      )}

      {showBill && order && (
        <BillModal
          order={order}
          menuItems={menuItems}
          currency={currency}
          taxRateBps={settings?.taxRateBps ?? 800}
          onClose={() => setShowBill(false)}
          onConfirm={async (tipGrosze, method) => {
            await payOrder(order.id, { tipGrosze, method });
            setShowBill(false);
            setSelectedTableId(null);
          }}
        />
      )}

      {showAdd && (
        <AddItemModal menuItems={scopedMenuItems} currency={currency} onClose={() => setShowAdd(false)} onAdd={handleAddFromMenu} />
      )}

      {showReserve && table && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-white/10 bg-[#1C1410] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#FAFAF7]">{t("reserveTable")}</h3>
              <button type="button" onClick={() => setShowReserve(false)} className="interactive text-[#6B5B50] hover:text-[#FAFAF7]">
                <X className="h-5 w-5" />
              </button>
            </div>
            {tableReservations.length > 0 && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-[#6B5B50]">{t("existingReservations")}</p>
                <div className="space-y-2">
                  {tableReservations.map((res) => (
                    <p key={res.id} className="text-xs text-[#A89080]">
                      {res.guestName} · {formatReservationRange(res.startsAt, res.endsAt)}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-[#6B5B50]">{t("guestName")}</span>
                <input
                  value={reserveName}
                  onChange={(e) => setReserveName(e.target.value)}
                  className="interactive w-full rounded-2xl border border-white/10 bg-[#120D09] px-3 py-2.5 text-sm text-[#FAFAF7]"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-[#6B5B50]">{t("guestPhone")}</span>
                <input
                  value={reservePhone}
                  onChange={(e) => setReservePhone(e.target.value)}
                  className="interactive w-full rounded-2xl border border-white/10 bg-[#120D09] px-3 py-2.5 text-sm text-[#FAFAF7]"
                />
              </label>
              <AppDateTimePicker
                dark
                label={t("startTime")}
                value={reserveStart || new Date().toISOString()}
                onChange={setReserveStart}
              />
              <AppSelect
                label={t("duration")}
                value={reserveDuration}
                onChange={(e) => setReserveDuration(e.target.value)}
                className="text-[#FAFAF7] [&_select]:border-white/10 [&_select]:bg-[#120D09] [&_select]:text-[#FAFAF7]"
              >
                <option value="30">{t("durationMinutes", { count: 30 })}</option>
                <option value="60">{t("durationMinutes", { count: 60 })}</option>
                <option value="90">{t("durationMinutes", { count: 90 })}</option>
                <option value="120">{t("durationMinutes", { count: 120 })}</option>
                <option value="180">{t("durationMinutes", { count: 180 })}</option>
              </AppSelect>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-[#6B5B50]">{t("notes")}</span>
                <textarea
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                  rows={2}
                  className="interactive w-full rounded-2xl border border-white/10 bg-[#120D09] px-3 py-2.5 text-sm text-[#FAFAF7]"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!reserveName.trim() || !reserveStart}
              onClick={() => void handleReserve()}
              className="interactive mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--primary)" }}
            >
              <CalendarClock className="h-4 w-4" /> {t("confirmReservation")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BillModal({
  order,
  menuItems,
  currency,
  taxRateBps,
  onClose,
  onConfirm,
}: {
  order: { items: { menuItemId: string; name: string; quantity: number; priceGrosze: number }[] };
  menuItems: { id: string; category: string }[];
  currency: string;
  taxRateBps: number;
  onClose: () => void;
  onConfirm: (tipGrosze: number, method: string) => void;
}) {
  const t = useTranslations("cashier");
  const [method, setMethod] = useState("card");
  const subtotal = order.items.reduce((s, i) => s + i.priceGrosze * i.quantity, 0);
  const tax = taxFromSubtotal(subtotal, taxRateBps);
  const tipGrosze = Math.round(subtotal * 0.1);
  const total = subtotal + tax + tipGrosze;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1C1410] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-[#FAFAF7]">{t("bill")}</h3>
          <button type="button" onClick={onClose} className="text-[#6B5B50] hover:text-[#FAFAF7]"><X className="h-5 w-5" /></button>
        </div>
        <OrderItemsGrouped items={order.items} menuItems={menuItems} currency={currency} dark compact showPrices />
        <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
          <div className="flex justify-between text-[#A89080]"><span>{t("subtotal")}</span><span className="font-mono">{formatMoney(subtotal, currency)}</span></div>
          <div className="flex justify-between text-[#A89080]"><span>{t("tax", { rate: taxRateBps / 100 })}</span><span className="font-mono">{formatMoney(tax, currency)}</span></div>
          <div className="flex justify-between text-[#A89080]"><span>{t("tip", { percent: 10 })}</span><span className="font-mono">{formatMoney(tipGrosze, currency)}</span></div>
          <div className="flex justify-between font-bold text-[#FAFAF7]"><span>{t("total")}</span><span className="font-mono" style={{ color: "var(--accent)" }}>{formatMoney(total, currency)}</span></div>
        </div>
        <div className="mt-4 flex gap-2">
          {[
            { id: "cash", label: t("paymentCash") },
            { id: "card", label: t("paymentCard") },
            { id: "online", label: t("paymentOnline") },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all"
              style={{
                background: method === id ? "var(--primary)" : "rgba(255,255,255,0.06)",
                color: method === id ? "#fff" : "#8A7060",
                border: `1px solid ${method === id ? "var(--primary)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void onConfirm(tipGrosze, method)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
          <Check className="h-4 w-4" /> {t("confirmBill")}
        </button>
      </div>
    </div>
  );
}

function AddItemModal({
  menuItems,
  currency,
  onClose,
  onAdd,
}: {
  menuItems: { id: string; name: string; priceGrosze: number; category: string }[];
  currency: string;
  onClose: () => void;
  onAdd: (id: string, qty: number) => void;
}) {
  const t = useTranslations("cashier");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("menuCategories");
  const [qty, setQty] = useState<Record<string, number>>({});

  const groups = groupItemsByCategory(
    menuItems.map((m) => ({ menuItemId: m.id, name: m.name, quantity: 0, priceGrosze: m.priceGrosze })),
    menuItems,
  );

  function categoryLabel(cat: string) {
    const key = CATEGORY_I18N_KEYS[cat as keyof typeof CATEGORY_I18N_KEYS];
    return key ? tCat(key) : cat;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl border border-white/10 bg-[#1C1410] p-4">
        <div className="mb-3 flex justify-between">
          <h3 className="font-serif text-[#FAFAF7]">{tCommon("menu")}</h3>
          <button type="button" onClick={onClose} className="text-[#6B5B50]"><X className="h-5 w-5" /></button>
        </div>
        {groups.map(({ category, items }) => (
          <div key={category} className="mb-4">
            <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-[#6B5B50]">{categoryLabel(category)}</p>
            <div className="space-y-1 rounded-xl bg-white/5 p-2">
              {items.map((item) => {
                const menuItem = menuItems.find((m) => m.id === item.menuItemId)!;
                return (
                  <div key={item.menuItemId} className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0">
                    <div>
                      <p className="font-medium text-[#FAFAF7]">{menuItem.name}</p>
                      <p className="text-xs text-[#6B5B50]">{formatMoney(menuItem.priceGrosze, currency)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setQty((p) => ({ ...p, [item.menuItemId]: Math.max(0, (p[item.menuItemId] ?? 0) - 1) }))} className="interactive rounded bg-white/10 p-1"><Minus className="h-3 w-3" /></button>
                      <span className="min-w-4 text-center font-mono">{qty[item.menuItemId] ?? 0}</span>
                      <button type="button" onClick={() => setQty((p) => ({ ...p, [item.menuItemId]: (p[item.menuItemId] ?? 0) + 1 }))} className="interactive rounded p-1 text-white" style={{ background: "var(--primary)" }}><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="mt-4 w-full rounded-xl py-2 text-sm font-semibold text-white"
          style={{ background: "var(--primary)" }}
          onClick={() => Object.entries(qty).forEach(([id, q]) => void onAdd(id, q))}
        >
          {tCommon("add")}
        </button>
      </div>
    </div>
  );
}
