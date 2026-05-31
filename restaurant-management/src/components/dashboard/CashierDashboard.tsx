"use client";

import { useState } from "react";
import {
  Check,
  Globe,
  LogOut,
  Minus,
  Plus,
  Receipt,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LocationSelector } from "@/components/layout/LocationSelector";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import { formatMoney, taxFromSubtotal } from "@/lib/currency";

const TABLE_STATUS: Record<string, { bg: string; border: string; text: string }> = {
  available: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#86EFAC" },
  occupied: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#FCD34D" },
  reserved: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "#93C5FD" },
};

export function CashierDashboard({ embedded = false, onLogout }: { embedded?: boolean; onLogout?: () => void }) {
  const t = useTranslations("cashier");
  const tTable = useTranslations("tableStatus");
  const tCommon = useTranslations("common");
  const { tenant, settings, menuItems, orders, tables, updateOrder, addOrder, payOrder } = useRestaurant();
  const currency = settings?.currency ?? "PLN";
  const taxRate = (settings?.taxRateBps ?? 800) / 100;

  const [tab, setTab] = useState<"tables" | "online">("tables");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const table = tables.find((tb) => tb.number === selectedTable);
  const order = table?.orderId ? orders.find((o) => o.id === table.orderId) : null;
  const onlineOrders = orders.filter((o) => ["online", "qr-menu"].includes(o.source) && o.status !== "paid");

  const subtotal = order?.items.reduce((s, i) => s + i.priceGrosze * i.quantity, 0) ?? 0;
  const tax = taxFromSubtotal(subtotal, settings?.taxRateBps ?? 800);

  async function handleNewOrder(tableNumber: number) {
    await addOrder({ tableNumber });
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
              {tables.map((tb) => {
                const st = TABLE_STATUS[tb.status] ?? TABLE_STATUS.available;
                const isSelected = selectedTable === tb.number;
                return (
                  <button
                    key={tb.number}
                    type="button"
                    onClick={() => setSelectedTable(selectedTable === tb.number ? null : tb.number)}
                    className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 transition-all"
                    style={{
                      borderColor: isSelected ? "var(--primary)" : st.border,
                      background: isSelected ? "rgba(196,98,45,0.2)" : st.bg,
                      color: isSelected ? "#FAFAF7" : st.text,
                      boxShadow: isSelected ? "0 0 0 2px rgba(196,98,45,0.3)" : undefined,
                    }}
                  >
                    <span className="font-mono text-lg font-bold">{tb.number}</span>
                    <span className="text-[0.6rem] opacity-80">{tTable(tb.status as "available" | "occupied" | "reserved")}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex flex-1 flex-col bg-[#0D0805]">
            {selectedTable ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div>
                    <h3 className="font-serif text-lg">{tCommon("table", { number: selectedTable })}</h3>
                    <p className="text-xs text-[#6B5B50]">{table?.status ? tTable(table.status as "available" | "occupied" | "reserved") : "—"}</p>
                  </div>
                  <div className="flex gap-2">
                    {order && (
                      <>
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
                    {!order && table?.status === "available" && (
                      <button type="button" onClick={() => void handleNewOrder(selectedTable)} className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
                        {t("newOrder")}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  {!order?.items.length ? (
                    <div className="flex h-full items-center justify-center text-[#4A3828]">{t("selectTable")}</div>
                  ) : (
                    order.items.map((item) => (
                      <div key={item.menuItemId} className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#1C1410] p-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#FAFAF7]">{item.name}</p>
                          <p className="text-xs text-[#6B5B50]">{formatMoney(item.priceGrosze, currency)}</p>
                        </div>
                        <button type="button" onClick={() => void handleQty(item.menuItemId, -1)} className="rounded-lg bg-white/10 p-1.5 text-[#D4C4B8]"><Minus className="h-3 w-3" /></button>
                        <span className="min-w-6 text-center font-mono font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => void handleQty(item.menuItemId, 1)} className="rounded-lg p-1.5 text-white" style={{ background: "var(--primary)" }}><Plus className="h-3 w-3" /></button>
                        <span className="min-w-16 text-right font-mono text-sm text-[#D4C4B8]">{formatMoney(item.priceGrosze * item.quantity, currency)}</span>
                        <button type="button" onClick={() => void handleQty(item.menuItemId, -item.quantity)} className="text-[#6B5B50] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))
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
      ) : (
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
                  <p className="font-semibold text-[#FAFAF7]">{o.customerName ?? tCommon("guest")}</p>
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
      )}

      {showBill && order && (
        <BillModal
          order={order}
          currency={currency}
          taxRateBps={settings?.taxRateBps ?? 800}
          onClose={() => setShowBill(false)}
          onConfirm={async (tipGrosze, method) => {
            await payOrder(order.id, { tipGrosze, method });
            setShowBill(false);
            setSelectedTable(null);
          }}
        />
      )}

      {showAdd && (
        <AddItemModal menuItems={menuItems.filter((m) => m.available)} currency={currency} onClose={() => setShowAdd(false)} onAdd={handleAddFromMenu} />
      )}
    </div>
  );
}

function BillModal({
  order,
  currency,
  taxRateBps,
  onClose,
  onConfirm,
}: {
  order: { items: { name: string; quantity: number; priceGrosze: number }[] };
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
        <div className="space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-[#D4C4B8]">
              <span>{item.name} ×{item.quantity}</span>
              <span className="font-mono">{formatMoney(item.priceGrosze * item.quantity, currency)}</span>
            </div>
          ))}
        </div>
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
  menuItems: { id: string; name: string; priceGrosze: number }[];
  currency: string;
  onClose: () => void;
  onAdd: (id: string, qty: number) => void;
}) {
  const t = useTranslations("cashier");
  const tCommon = useTranslations("common");
  const [qty, setQty] = useState<Record<string, number>>({});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl border border-white/10 bg-[#1C1410] p-4">
        <div className="mb-3 flex justify-between">
          <h3 className="font-serif text-[#FAFAF7]">{tCommon("menu")}</h3>
          <button type="button" onClick={onClose} className="text-[#6B5B50]"><X className="h-5 w-5" /></button>
        </div>
        {menuItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between border-b border-white/10 py-2 text-sm">
            <div>
              <p className="font-medium text-[#FAFAF7]">{item.name}</p>
              <p className="text-xs text-[#6B5B50]">{formatMoney(item.priceGrosze, currency)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQty((p) => ({ ...p, [item.id]: Math.max(0, (p[item.id] ?? 0) - 1) }))} className="rounded bg-white/10 p-1"><Minus className="h-3 w-3" /></button>
              <span className="min-w-4 text-center font-mono">{qty[item.id] ?? 0}</span>
              <button type="button" onClick={() => setQty((p) => ({ ...p, [item.id]: (p[item.id] ?? 0) + 1 }))} className="rounded p-1 text-white" style={{ background: "var(--primary)" }}><Plus className="h-3 w-3" /></button>
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
