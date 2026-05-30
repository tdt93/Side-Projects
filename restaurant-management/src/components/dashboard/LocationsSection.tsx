"use client";

import { useState } from "react";
import { Edit3, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRestaurant, type LocationDto } from "@/components/providers/RestaurantProvider";

function mapEmbedUrl(loc: LocationDto) {
  if (loc.latitude != null && loc.longitude != null) {
    const lat = loc.latitude;
    const lng = loc.longitude;
    const delta = 0.01;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(loc.address)}&z=15&output=embed`;
}

type FormState = { name: string; address: string; phone: string; isActive: boolean };

const emptyForm: FormState = { name: "", address: "", phone: "", isActive: true };

export function LocationsSection() {
  const t = useTranslations("owner.locationsSection");
  const tCommon = useTranslations("common");
  const { locations, addLocation, updateLocation, deleteLocation } = useRestaurant();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocationDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(loc: LocationDto) {
    setEditing(loc);
    setForm({ name: loc.name, address: loc.address, phone: loc.phone, isActive: loc.isActive });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        await updateLocation(editing.id, form);
      } else {
        await addLocation(form);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle", { count: locations.length })}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> {tCommon("add")}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {locations.map((loc) => (
          <div key={loc.id} className="dashboard-card overflow-hidden">
            <div className="relative aspect-[16/9] w-full bg-muted">
              <iframe
                title={t("mapTitle", { name: loc.name })}
                src={mapEmbedUrl(loc)}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{loc.name}</h3>
                    <p className="text-sm text-muted-foreground">{loc.address}</p>
                    <p className="text-sm text-muted-foreground">{loc.phone}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    loc.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {loc.isActive ? t("active") : t("inactive")}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(loc)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-semibold"
                >
                  <Edit3 className="h-4 w-4" /> {tCommon("edit")}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteLocation(loc.id)}
                  className="flex items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl">{editing ? t("editLocation") : t("addLocation")}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("name")}</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("address")}</span>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("phone")}</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                {t("active")}
              </label>
            </div>
            <button
              type="button"
              disabled={saving || !form.name.trim()}
              onClick={() => void save()}
              className="btn-primary mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {tCommon("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
