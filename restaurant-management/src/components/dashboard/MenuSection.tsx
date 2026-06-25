"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ImagePlus,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LayoutToggle } from "@/components/ui/LayoutToggle";
import { SlideInPanel } from "@/components/ui/SlideInPanel";
import { AppSelect } from "@/components/ui/AppSelect";
import { useRestaurant, type MenuItemDto } from "@/components/providers/RestaurantProvider";
import { useLayoutPreference } from "@/hooks/use-layout-preference";
import { formatMoney } from "@/lib/currency";
import { CATEGORY_I18N_KEYS } from "@/lib/menu-categories";

type ImageAspect = "1:1" | "3:4";

type FormState = {
  name: string;
  price: string;
  description: string;
  category: string;
  isCombo: boolean;
  imageAspectRatio: ImageAspect;
};

const emptyForm: FormState = {
  name: "",
  price: "",
  description: "",
  category: "Mains",
  isCombo: false,
  imageAspectRatio: "1:1",
};

export function MenuSection() {
  const t = useTranslations("owner.menuSection");
  const tCat = useTranslations("menuCategories");
  const tCommon = useTranslations("common");
  const { settings, menuItems, locations, categories: dbCategories, viewAllLocations, activeLocationId, updateMenuItem, deleteMenuItem, addCategory, updateCategory, deleteCategory, refresh } = useRestaurant();
  const currency = settings?.currency ?? "PLN";

  const [category, setCategory] = useState("All");
  const [locationFilter, setLocationFilter] = useState<"all" | "shared" | string>("all");
  const [itemScope, setItemScope] = useState<"shared" | string>("shared");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemDto | null>(null);
  const [layout, setLayout] = useLayoutPreference("menu-layout", "grid");

  useEffect(() => {
    if (activeLocationId) setItemScope(activeLocationId);
  }, [activeLocationId]);

  const categoryNames =
    dbCategories.length > 0
      ? dbCategories.map((c) => c.name)
      : [...new Set(menuItems.map((m) => m.category))].filter(Boolean);

  const filterCategories = ["All", ...categoryNames];

  const locationScoped = viewAllLocations
    ? menuItems.filter((m) => {
        if (locationFilter === "all") return true;
        if (locationFilter === "shared") return m.isShared;
        return m.locationId === locationFilter || m.isShared;
      })
    : menuItems;

  const filtered =
    category === "All" ? locationScoped : locationScoped.filter((m) => m.category === category);

  function locationLabel(item: MenuItemDto) {
    if (item.isShared) return t("sharedMenu");
    const loc = locations.find((l) => l.id === item.locationId);
    return loc?.name ?? t("branchOnly");
  }

  function categoryLabel(cat: string) {
    const key = CATEGORY_I18N_KEYS[cat as keyof typeof CATEGORY_I18N_KEYS];
    return key ? tCat(key) : cat;
  }

  function openAdd() {
    setEditingItem(null);
    setForm(emptyForm);
    if (activeLocationId) {
      setItemScope(activeLocationId);
    } else if (locationFilter !== "all" && locationFilter !== "shared") {
      setItemScope(locationFilter);
    } else {
      setItemScope("shared");
    }
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  }

  function openEdit(item: MenuItemDto) {
    setEditingItem(item);
    setForm({
      name: item.name,
      price: (item.priceGrosze / 100).toFixed(2),
      description: item.description,
      category: item.category,
      isCombo: item.isCombo,
      imageAspectRatio: item.imageAspectRatio ?? "1:1",
    });
    setImageFile(null);
    setImagePreview(item.imageUrl ?? null);
    setModalOpen(true);
  }

  function handleImageSelect(file: File | null) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!form.name || !form.price) return;
    setSaving(true);

    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("category", form.category);
    fd.append("priceGrosze", String(Math.round(parseFloat(form.price) * 100)));
    fd.append("description", form.description);
    fd.append("isCombo", String(form.isCombo));
    fd.append("imageAspectRatio", form.imageAspectRatio);
    if (itemScope !== "shared") fd.append("locationId", itemScope);
    if (imageFile) fd.append("image", imageFile);

    try {
      if (editingItem) {
        await fetch(`/api/menu/items/${editingItem.id}`, { method: "PATCH", body: fd });
      } else {
        await fetch("/api/menu/items", { method: "POST", body: fd });
      }
      setModalOpen(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-section-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("summary", {
              total: menuItems.length,
              unavailable: menuItems.filter((m) => !m.available).length,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LayoutToggle
            value={layout}
            onChange={setLayout}
            options={["grid", "list", "compact"]}
            labels={{ grid: t("layoutGrid"), list: t("layoutList"), compact: t("layoutCompact") }}
          />
          <button type="button" onClick={openAdd} className="interactive btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm">
            <Plus className="h-4 w-4" /> {t("addItem")}
          </button>
        </div>
      </div>

      <div className="dashboard-card p-4">
        <button
          type="button"
          onClick={() => setShowCategories((v) => !v)}
          className="interactive flex w-full items-center justify-between rounded-xl px-1 py-0.5 text-sm font-semibold"
          aria-expanded={showCategories}
        >
          <span className="flex items-center gap-2">
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showCategories ? "rotate-180" : ""}`}
            />
            {t("manageCategories")}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {dbCategories.length || categoryNames.length}
          </span>
        </button>
        {showCategories && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              {(dbCategories.length ? dbCategories : categoryNames.map((name, i) => ({ id: name, name, sortOrder: i }))).map(
                (cat) => (
                  <div key={cat.id} className="flex items-center gap-1 rounded-full bg-muted pl-3 pr-1 py-1 text-sm">
                    {editingCategoryId === cat.id ? (
                      <>
                        <input
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="w-24 rounded bg-background px-2 py-0.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof cat.id === "string" && cat.id.length > 10) {
                              void updateCategory(cat.id, { name: editingCategoryName }).then(() => setEditingCategoryId(null));
                            }
                          }}
                          className="rounded p-1 hover:bg-background"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{categoryLabel(cat.name)}</span>
                        {dbCategories.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditingCategoryName(cat.name);
                              }}
                              className="interactive rounded p-1 hover:bg-background"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteCategory(cat.id)}
                              className="interactive rounded p-1 text-red-500 hover:bg-background"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ),
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t("newCategory")}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!newCategoryName.trim()}
                onClick={() => {
                  void addCategory(newCategoryName.trim()).then(() => setNewCategoryName(""));
                }}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {viewAllLocations && locations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: t("all") },
            { id: "shared", label: t("sharedMenu") },
            ...locations.map((l) => ({ id: l.id, label: l.name })),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLocationFilter(tab.id)}
              className="interactive shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                background: locationFilter === tab.id ? "var(--primary)" : "var(--muted)",
                color: locationFilter === tab.id ? "#fff" : undefined,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="interactive shrink-0 rounded-full px-3 py-1.5 text-sm font-medium"
            style={{
              background: category === cat ? "var(--primary)" : "var(--muted)",
              color: category === cat ? "#fff" : undefined,
            }}
          >
            {cat === "All" ? t("all") : categoryLabel(cat)}
          </button>
        ))}
      </div>

      <div
        className={
          layout === "grid"
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : layout === "list"
              ? "flex flex-col gap-3"
              : "flex flex-col gap-2"
        }
      >
        {filtered.map((item, index) => {
          const aspect = item.imageAspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-square";

          if (layout === "list") {
            return (
              <article
                key={item.id}
                className="dashboard-card group flex gap-4 overflow-hidden p-3 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <MenuItemBody
                    item={item}
                    currency={currency}
                    categoryLabel={categoryLabel}
                    locationLabel={locationLabel}
                    t={t}
                    onEdit={() => openEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                    onToggle={() => void updateMenuItem(item.id, { available: !item.available })}
                  />
                </div>
              </article>
            );
          }

          if (layout === "compact") {
            return (
              <article
                key={item.id}
                className="dashboard-card flex items-center justify-between gap-3 px-4 py-3 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{item.name}</h3>
                    {!item.available && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
                        {t("offMenu")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel(item.category)} · {locationLabel(item)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-primary">
                  {formatMoney(item.priceGrosze, currency)}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openEdit(item)} className="interactive rounded-lg border border-primary/25 bg-primary/10 p-1.5 text-primary hover:bg-primary/15" title={t("editItem")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(item)} className="interactive rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          }

          return (
            <article
              key={item.id}
              className="dashboard-card group overflow-hidden transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className={`relative ${aspect} max-h-36 overflow-hidden bg-muted`}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/40">
                    <ImagePlus className="h-10 w-10" />
                  </div>
                )}
                {!item.available && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                    {t("offMenu")}
                  </span>
                )}
                {item.isCombo && (
                  <span className="absolute right-2 top-2 rounded-full bg-violet-600/90 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                    {t("combo")}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 p-3">
                <MenuItemBody
                  item={item}
                  currency={currency}
                  categoryLabel={categoryLabel}
                  locationLabel={locationLabel}
                  t={t}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget(item)}
                  onToggle={() => void updateMenuItem(item.id, { available: !item.available })}
                />
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="dashboard-card flex flex-col items-center py-16 text-muted-foreground">
          <ImagePlus className="mb-2 h-12 w-12 opacity-30" />
          {t("empty")}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("deleteItemTitle")}
        message={t("deleteItemMessage", { name: deleteTarget?.name ?? "" })}
        confirmLabel={tCommon("delete")}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteMenuItem(deleteTarget.id).then(() => setDeleteTarget(null));
        }}
      />

      <SlideInPanel
        open={modalOpen}
        title={editingItem ? t("editItem") : t("addItem")}
        onClose={() => setModalOpen(false)}
        wide
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-semibold">
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              disabled={saving || !form.name || !form.price}
              onClick={() => void handleSave()}
              className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
            >
              {saving ? tCommon("loading") : <><Check className="h-4 w-4" /> {tCommon("save")}</>}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            className={`relative mx-auto w-full max-w-[200px] overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted ${
              form.imageAspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-square"
            }`}
          >
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground"
              >
                <Upload className="h-8 w-8 opacity-40" />
                <span className="px-4 text-center text-xs">{t("uploadHint")}</span>
              </button>
            )}
            {imagePreview && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 rounded-lg bg-black/60 p-1.5 text-white"
              >
                <Upload className="h-3.5 w-3.5" />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)} />
          </div>

          <div className="flex justify-center gap-2">
            {(["1:1", "3:4"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setForm((p) => ({ ...p, imageAspectRatio: ratio }))}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: form.imageAspectRatio === ratio ? "var(--primary)" : "var(--muted)",
                  color: form.imageAspectRatio === ratio ? "#fff" : undefined,
                }}
              >
                {ratio === "1:1" ? t("ratioSquare") : t("ratioPortrait")}
              </button>
            ))}
          </div>
          <p className="text-center text-[0.65rem] text-muted-foreground">{t("compressNote")}</p>

          {(["name", "price", "description"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(key)}
              </label>
              <input
                type={key === "price" ? "number" : "text"}
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none"
                placeholder={key === "price" ? `0.00 ${currency}` : undefined}
              />
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("category")}</label>
            <AppSelect value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              {categoryNames.map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </AppSelect>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isCombo} onChange={(e) => setForm((p) => ({ ...p, isCombo: e.target.checked }))} />
            {t("combo")}
          </label>

          {!editingItem && locations.length > 0 && (
            <AppSelect
              label={t("scopeShared")}
              value={itemScope}
              onChange={(e) => setItemScope(e.target.value)}
            >
              <option value="shared">{t("scopeShared")}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{t("scopeBranch")}: {l.name}</option>
              ))}
            </AppSelect>
          )}
        </div>
      </SlideInPanel>
    </div>
  );
}

function MenuItemBody({
  item,
  currency,
  categoryLabel,
  locationLabel,
  t,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: MenuItemDto;
  currency: string;
  categoryLabel: (cat: string) => string;
  locationLabel: (item: MenuItemDto) => string;
  t: (key: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{item.name}</h3>
          <p className="text-xs text-muted-foreground">
            {categoryLabel(item.category)} · {locationLabel(item)}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm font-bold text-primary">
          {formatMoney(item.priceGrosze, currency)}
        </span>
      </div>
      {item.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
      )}
      <div className="flex items-center justify-between border-t border-border/50 pt-3">
        <button
          type="button"
          onClick={onToggle}
          className="interactive flex items-center gap-1 text-xs font-semibold"
          style={{ color: item.available ? "#16A34A" : "var(--muted-foreground)" }}
        >
          {item.available ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
          {item.available ? t("available") : t("offMenu")}
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            title={t("editItem")}
            className="interactive rounded-lg border border-primary/25 bg-primary/10 p-2 text-primary hover:bg-primary/15"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="interactive rounded-lg p-2 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
