"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useParams } from "next/navigation";
import { formatMoney } from "@/lib/currency";

type MenuPayload = {
  tenant: { displayName: string; logoUrl?: string | null; primaryColor: string; accentColor: string };
  location: { id: string; name: string; address: string };
  currency: string;
  taxRateBps: number;
  categories: string[];
  menuItems: {
    id: string;
    name: string;
    category: string;
    priceGrosze: number;
    description: string;
    imageUrl?: string | null;
    imageAspectRatio?: string;
  }[];
};

type CartLine = { menuItemId: string; name: string; priceGrosze: number; quantity: number };

export default function PublicMenuPage() {
  const params = useParams<{ slug: string; locationId: string }>();
  const [data, setData] = useState<MenuPayload | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState("All");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ orderId: string; message?: string } | null>(null);

  useEffect(() => {
    void fetch(`/api/public/menu/${params.slug}/${params.locationId}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.slug, params.locationId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (category === "All") return data.menuItems;
    return data.menuItems.filter((m) => m.category === category);
  }, [data, category]);

  const subtotal = cart.reduce((s, l) => s + l.priceGrosze * l.quantity, 0);
  const tax = data ? Math.round((subtotal * data.taxRateBps) / 10000) : 0;
  const total = subtotal + tax;

  function addToCart(item: MenuPayload["menuItems"][0]) {
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) => (l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { menuItemId: item.id, name: item.name, priceGrosze: item.priceGrosze, quantity: 1 }];
    });
  }

  function changeQty(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  async function submitOrder() {
    if (!data || cart.length === 0 || !name.trim()) return;
    if (!email.trim() && !phone.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: params.slug,
          locationId: params.locationId,
          customerName: name.trim(),
          customerEmail: email.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          items: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setDone({ orderId: json.orderId, message: json.message });
        setCart([]);
        setCheckoutOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <ShoppingCart className="h-12 w-12 text-primary" />
        <h1 className="font-serif text-2xl">Order placed!</h1>
        <p className="text-muted-foreground">Thank you, {name}.</p>
        <p className="max-w-sm text-sm text-muted-foreground">{done.message ?? "Your order is pending confirmation."}</p>
        <p className="font-mono text-xs text-muted-foreground">#{done.orderId.slice(-8)}</p>
        <button type="button" onClick={() => setDone(null)} className="btn-primary mt-4 px-6 py-2">
          Order again
        </button>
      </div>
    );
  }

  const categories = ["All", ...(data.categories.length ? data.categories : [...new Set(data.menuItems.map((m) => m.category))])];

  return (
    <div className="min-h-screen bg-background pb-28" style={{ ["--primary" as string]: data.tenant.primaryColor }}>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 py-4">
        <h1 className="font-serif text-xl">{data.tenant.displayName}</h1>
        <p className="text-sm text-muted-foreground">{data.location.name}</p>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium"
            style={{
              background: category === cat ? data.tenant.primaryColor : "var(--muted)",
              color: category === cat ? "#fff" : undefined,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-4 px-4 sm:grid-cols-2">
        {filtered.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className={`w-full object-cover ${item.imageAspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-square"}`}
              />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <p className="shrink-0 font-mono font-bold">{formatMoney(item.priceGrosze, data.currency)}</p>
              </div>
              <button
                type="button"
                onClick={() => addToCart(item)}
                className="mt-3 w-full rounded-xl py-2 text-sm font-semibold text-white"
                style={{ background: data.tenant.primaryColor }}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 shadow-lg">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{cart.reduce((s, l) => s + l.quantity, 0)} items</p>
              <p className="font-mono text-lg font-bold">{formatMoney(total, data.currency)}</p>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="rounded-xl px-6 py-3 text-sm font-semibold text-white"
              style={{ background: data.tenant.primaryColor }}
            >
              Checkout
            </button>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-card p-5">
            <h2 className="mb-4 font-serif text-xl">Your details</h2>
            <div className="mb-4 max-h-40 space-y-2 overflow-y-auto">
              {cart.map((line) => (
                <div key={line.menuItemId} className="flex items-center justify-between text-sm">
                  <span>{line.name}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeQty(line.menuItemId, -1)} className="rounded bg-muted p-1">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-mono">{line.quantity}</span>
                    <button type="button" onClick={() => changeQty(line.menuItemId, 1)} className="rounded bg-muted p-1">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name *"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">Email or phone required for loyalty tracking.</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono font-bold">{formatMoney(total, data.currency)}</span>
              <button
                type="button"
                disabled={submitting || !name.trim() || (!email.trim() && !phone.trim())}
                onClick={() => void submitOrder()}
                className="rounded-xl px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: data.tenant.primaryColor }}
              >
                Place order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
