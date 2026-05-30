"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Package, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRestaurant } from "@/components/providers/RestaurantProvider";
import { formatMoney } from "@/lib/currency";

type RecipeRow = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  quantity: number;
};

export function InventorySection() {
  const t = useTranslations("owner.inventorySection");
  const tCommon = useTranslations("common");
  const { inventoryItems, menuItems, settings, addInventoryItem, purchaseStock, refresh } = useRestaurant();
  const currency = settings?.currency ?? "PLN";

  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [tab, setTab] = useState<"stock" | "recipes">("stock");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [purchaseQty, setPurchaseQty] = useState<Record<string, string>>({});
  const [recipeForm, setRecipeForm] = useState({ menuItemId: "", inventoryItemId: "", quantity: "0.1" });

  useEffect(() => {
    void fetch("/api/inventory/recipes")
      .then((r) => r.json())
      .then(setRecipes);
  }, [inventoryItems]);

  async function handleAddItem() {
    if (!newName.trim()) return;
    await addInventoryItem({ name: newName.trim(), unit: newUnit, stockQty: 0, minStockQty: 0, costGrosze: 0 });
    setNewName("");
  }

  async function handlePurchase(id: string) {
    const qty = parseFloat(purchaseQty[id] ?? "0");
    if (!qty || qty <= 0) return;
    await purchaseStock(id, qty);
    setPurchaseQty({ ...purchaseQty, [id]: "" });
  }

  async function handleAddRecipe() {
    const qty = parseFloat(recipeForm.quantity);
    if (!recipeForm.menuItemId || !recipeForm.inventoryItemId || !qty) return;
    await fetch("/api/inventory/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuItemId: recipeForm.menuItemId,
        inventoryItemId: recipeForm.inventoryItemId,
        quantity: qty,
      }),
    });
    await refresh();
    const rows = await fetch("/api/inventory/recipes").then((r) => r.json());
    setRecipes(rows);
  }

  async function handleDeleteRecipe(id: string) {
    await fetch(`/api/inventory/recipes?id=${id}`, { method: "DELETE" });
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="font-serif text-2xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("stock")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "stock" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          {t("stockTab")}
        </button>
        <button
          type="button"
          onClick={() => setTab("recipes")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "recipes" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          {t("recipesTab")}
        </button>
      </div>

      {tab === "stock" && (
        <>
          <div className="dashboard-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("itemName")}</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="w-full text-sm sm:w-28">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("unit")}</span>
              <input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
              />
            </label>
            <button type="button" onClick={() => void handleAddItem()} className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm">
              <Plus className="h-4 w-4" /> {tCommon("add")}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {inventoryItems.map((item) => {
              const low = item.stockQty <= item.minStockQty;
              return (
                <div key={item.id} className="dashboard-card p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{item.name}</h3>
                    </div>
                    {low && (
                      <span title={t("lowStock")}>
                        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("inStock")}</p>
                      <p className="font-mono font-bold">
                        {item.stockQty} {item.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("sold")}</p>
                      <p className="font-mono font-bold">
                        {item.soldQty.toFixed(2)} {item.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("cost")}</p>
                      <p className="font-mono">{formatMoney(item.costGrosze, currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("recipes")}</p>
                      <p className="font-mono">{item.recipeCount}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t("purchaseQty")}
                      value={purchaseQty[item.id] ?? ""}
                      onChange={(e) => setPurchaseQty({ ...purchaseQty, [item.id]: e.target.value })}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handlePurchase(item.id)}
                      className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold"
                    >
                      {t("purchase")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "recipes" && (
        <div className="space-y-4">
          <div className="dashboard-card grid gap-3 p-4 md:grid-cols-4">
            <select
              value={recipeForm.menuItemId}
              onChange={(e) => setRecipeForm({ ...recipeForm, menuItemId: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("selectDish")}</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={recipeForm.inventoryItemId}
              onChange={(e) => setRecipeForm({ ...recipeForm, inventoryItemId: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("selectIngredient")}</option>
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={recipeForm.quantity}
              onChange={(e) => setRecipeForm({ ...recipeForm, quantity: e.target.value })}
              placeholder={t("qtyPerDish")}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => void handleAddRecipe()} className="btn-primary py-2 text-sm">
              {t("linkRecipe")}
            </button>
          </div>

          <div className="dashboard-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">{t("dish")}</th>
                  <th className="px-4 py-3">{t("ingredient")}</th>
                  <th className="px-4 py-3">{t("qtyPerDish")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {recipes.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-4 py-3">{r.menuItemName}</td>
                    <td className="px-4 py-3">{r.inventoryItemName}</td>
                    <td className="px-4 py-3 font-mono">
                      {r.quantity} {r.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => void handleDeleteRecipe(r.id)} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
