"use client";

import { useState } from "react";
import { Clock, Edit3, MapPin, Plus, QrCode, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LayoutToggle } from "@/components/ui/LayoutToggle";
import { useRestaurant, type LocationDto } from "@/components/providers/RestaurantProvider";
import { useLayoutPreference } from "@/hooks/use-layout-preference";
import {
  DEFAULT_OPENING_HOURS,
  parseOpeningHours,
  serializeOpeningHours,
  WEEKDAYS,
  type OpeningHours,
} from "@/lib/opening-hours";

function mapEmbedUrl(loc: LocationDto) {
  if (loc.latitude != null && loc.longitude != null) {
    const lat = loc.latitude;
    const lng = loc.longitude;
    const delta = 0.01;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(loc.address)}&z=15&output=embed`;
}

type FormState = {
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  openingHours: OpeningHours;
};

const emptyForm: FormState = {
  name: "",
  address: "",
  phone: "",
  isActive: true,
  openingHours: { ...DEFAULT_OPENING_HOURS },
};

function LocationCard({
  loc,
  layout,
  index,
  t,
  tCommon,
  weekdayLabel,
  onEdit,
  onDelete,
}: {
  loc: LocationDto;
  layout: "grid" | "list";
  index: number;
  t: (key: string, values?: Record<string, string | number>) => string;
  tCommon: (key: string) => string;
  weekdayLabel: (day: (typeof WEEKDAYS)[number]) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hours = parseOpeningHours(loc.openingHours);
  const todayKey = WEEKDAYS[(new Date().getDay() + 6) % 7]!;
  const todayHours = hours[todayKey];

  const mapBlock =
    layout === "grid" ? (
      <div className="relative aspect-[21/9] w-full bg-muted">
        <iframe
          title={t("mapTitle", { name: loc.name })}
          src={mapEmbedUrl(loc)}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    ) : (
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-36">
        <iframe
          title={t("mapTitle", { name: loc.name })}
          src={mapEmbedUrl(loc)}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );

  const body = (
    <div className={layout === "list" ? "flex min-w-0 flex-1 flex-col justify-center gap-2 p-3 sm:p-0" : "p-3"}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {layout === "grid" && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg stat-card-icon">
              <MapPin className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold">{loc.name}</h3>
            <p className="text-xs text-muted-foreground">{loc.address}</p>
            <p className="text-xs text-muted-foreground">{loc.phone}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
            loc.isActive
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {loc.isActive ? t("active") : t("inactive")}
        </span>
      </div>
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>
          {t("todayHours")}: {todayHours === "closed" ? t("closed") : todayHours}
        </span>
      </div>
      <details className="group mb-2 rounded-xl border border-border/60 bg-muted/30 px-2 py-1.5">
        <summary className="interactive cursor-pointer list-none text-xs font-semibold text-muted-foreground marker:content-none">
          {t("openingHours")}
        </summary>
        <ul className="mt-2 space-y-1 border-t border-border/50 pt-2 text-[0.65rem] text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <li key={day} className="flex justify-between gap-2">
              <span>{weekdayLabel(day)}</span>
              <span className="font-mono">{hours[day] === "closed" ? t("closed") : hours[day]}</span>
            </li>
          ))}
        </ul>
      </details>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="interactive flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted px-2 py-1.5 text-xs font-semibold hover:bg-muted/80"
        >
          <Edit3 className="h-3.5 w-3.5" /> {tCommon("edit")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="interactive flex items-center justify-center rounded-xl bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  if (layout === "list") {
    return (
      <div
        className="dashboard-card flex flex-col gap-0 overflow-hidden sm:flex-row sm:items-stretch sm:gap-3 sm:p-3"
        style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      >
        {mapBlock}
        {body}
      </div>
    );
  }

  return (
    <div
      className="dashboard-card overflow-hidden animate-fade-in"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {mapBlock}
      {body}
    </div>
  );
}

export function LocationsSection() {
  const t = useTranslations("owner.locationsSection");
  const tCommon = useTranslations("common");
  const { locations, tables, addLocation, updateLocation, deleteLocation, refresh } = useRestaurant();
  const [layout, setLayout] = useLayoutPreference("locations-layout", "grid");
  const viewLayout: "grid" | "list" = layout === "list" ? "list" : "grid";

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocationDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocationDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newTable, setNewTable] = useState<Record<string, { number: string; name: string; seats: string }>>({});
  const [busyTableId, setBusyTableId] = useState<string | null>(null);

  function weekdayLabel(day: (typeof WEEKDAYS)[number]) {
    return t(`weekdays.${day}`);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(loc: LocationDto) {
    setEditing(loc);
    setForm({
      name: loc.name,
      address: loc.address,
      phone: loc.phone,
      isActive: loc.isActive,
      openingHours: parseOpeningHours(loc.openingHours),
    });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        openingHours: serializeOpeningHours(form.openingHours),
      };
      if (editing) {
        await updateLocation(editing.id, payload);
      } else {
        await addLocation(payload);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function addTable(locationId: string) {
    const draft = newTable[locationId] ?? { number: "", name: "", seats: "4" };
    const number = Number(draft.number);
    const seats = Number(draft.seats || "4");
    if (!Number.isInteger(number) || number <= 0) return;
    setBusyTableId(`new:${locationId}`);
    try {
      await fetch(`/api/locations/${locationId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, name: draft.name.trim() || undefined, seats }),
      });
      setNewTable((prev) => ({ ...prev, [locationId]: { number: "", name: "", seats: "4" } }));
      await refresh();
    } finally {
      setBusyTableId(null);
    }
  }

  async function patchTable(locationId: string, tableId: string, patch: { number?: number; name?: string | null; seats?: number }) {
    setBusyTableId(tableId);
    try {
      await fetch(`/api/locations/${locationId}/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await refresh();
    } finally {
      setBusyTableId(null);
    }
  }

  async function removeTable(locationId: string, tableId: string) {
    setBusyTableId(tableId);
    try {
      await fetch(`/api/locations/${locationId}/tables/${tableId}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusyTableId(null);
    }
  }

  async function downloadTableQr(locationId: string, tableId: string, label: string) {
    const res = await fetch(`/api/locations/${locationId}/qr?tableId=${encodeURIComponent(tableId)}`);
    if (!res.ok) return;
    const { png } = (await res.json()) as { png: string };
    const a = document.createElement("a");
    a.href = png;
    a.download = `${label}-qr.png`;
    a.click();
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 animate-section-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle", { count: locations.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LayoutToggle
            value={viewLayout}
            onChange={(mode) => setLayout(mode)}
            options={["grid", "list"]}
            labels={{ grid: t("layoutGrid"), list: t("layoutList") }}
          />
          <button type="button" onClick={openCreate} className="interactive btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm">
            <Plus className="h-4 w-4" /> {tCommon("add")}
          </button>
        </div>
      </div>

      <div className={viewLayout === "grid" ? "grid gap-3 sm:grid-cols-2" : "flex flex-col gap-3"}>
        {locations.map((loc, index) => (
          <LocationCard
            key={loc.id}
            loc={loc}
            layout={viewLayout}
            index={index}
            t={t}
            tCommon={tCommon}
            weekdayLabel={weekdayLabel}
            onEdit={() => openEdit(loc)}
            onDelete={() => setDeleteTarget(loc)}
          />
        ))}
      </div>

      <div className="space-y-4">
        {locations.map((loc) => {
          const locTables = tables.filter((tb) => tb.locationId === loc.id).sort((a, b) => a.number - b.number);
          const draft = newTable[loc.id] ?? { number: "", name: "", seats: "4" };
          return (
            <div key={`tables-${loc.id}`} className="dashboard-card p-4">
              <h3 className="mb-3 text-sm font-semibold">{loc.name} — {t("tablesTitle")}</h3>
              <div className="space-y-2">
                {locTables.map((tb) => (
                  <div key={tb.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2">
                    <input
                      defaultValue={tb.number}
                      type="number"
                      min={1}
                      className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isInteger(next) && next > 0 && next !== tb.number) void patchTable(loc.id, tb.id, { number: next });
                      }}
                    />
                    <input
                      defaultValue={tb.name ?? ""}
                      placeholder={t("tableName")}
                      className="min-w-40 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next !== (tb.name ?? "")) void patchTable(loc.id, tb.id, { name: next || null });
                      }}
                    />
                    <input
                      defaultValue={tb.seats}
                      type="number"
                      min={1}
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isInteger(next) && next > 0 && next !== tb.seats) void patchTable(loc.id, tb.id, { seats: next });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void downloadTableQr(loc.id, tb.id, `${loc.name}-table-${tb.number}`)}
                      className="interactive rounded-lg bg-muted px-2 py-1 text-xs"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busyTableId === tb.id}
                      onClick={() => void removeTable(loc.id, tb.id)}
                      className="interactive rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={draft.number}
                  onChange={(e) => setNewTable((prev) => ({ ...prev, [loc.id]: { ...draft, number: e.target.value } }))}
                  placeholder={t("tableNumber")}
                  type="number"
                  min={1}
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                />
                <input
                  value={draft.name}
                  onChange={(e) => setNewTable((prev) => ({ ...prev, [loc.id]: { ...draft, name: e.target.value } }))}
                  placeholder={t("tableName")}
                  className="min-w-40 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                />
                <input
                  value={draft.seats}
                  onChange={(e) => setNewTable((prev) => ({ ...prev, [loc.id]: { ...draft, seats: e.target.value } }))}
                  placeholder={t("seats")}
                  type="number"
                  min={1}
                  className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  disabled={busyTableId === `new:${loc.id}` || !draft.number}
                  onClick={() => void addTable(loc.id)}
                  className="interactive btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  <Plus className="mr-1 inline h-3 w-3" />
                  {tCommon("add")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("deleteLocationTitle")}
        message={t("deleteLocationMessage", { name: deleteTarget?.name ?? "" })}
        confirmLabel={tCommon("delete")}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteLocation(deleteTarget.id).then(() => setDeleteTarget(null));
        }}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center animate-fade-in">
          <div className="max-h-[92vh] w-full max-w-md overflow-auto rounded-2xl bg-card p-5 shadow-xl animate-section-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl">{editing ? t("editLocation") : t("addLocation")}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="interactive rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("name")}</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 transition-colors focus:border-primary/40"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("address")}</span>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 transition-colors focus:border-primary/40"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{t("phone")}</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 transition-colors focus:border-primary/40"
                />
              </label>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t("openingHours")}</p>
                <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                  {WEEKDAYS.map((day) => (
                    <label key={day} className="flex items-center justify-between gap-2 text-sm">
                      <span className="w-24 text-xs font-medium">{weekdayLabel(day)}</span>
                      <input
                        value={form.openingHours[day]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            openingHours: { ...form.openingHours, [day]: e.target.value },
                          })
                        }
                        placeholder="09:00-22:00"
                        className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[0.65rem] text-muted-foreground">{t("openingHoursHint")}</p>
              </div>
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
              className="interactive btn-primary mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {tCommon("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
