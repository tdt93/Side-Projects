"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StaffRole } from "@/lib/session";

export type MenuItemDto = {
  id: string;
  name: string;
  category: string;
  priceGrosze: number;
  description: string;
  imageUrl?: string;
  imageAspectRatio?: "1:1" | "3:4";
  available: boolean;
  isCombo: boolean;
  comboItemIds: string[];
  locationId?: string;
  isShared?: boolean;
};

export type OrderLineInput = {
  menuItemId: string;
  quantity: number;
  notes?: string;
};

export type OrderLineDto = {
  menuItemId: string;
  name: string;
  quantity: number;
  priceGrosze: number;
  notes?: string;
};

export type OrderDto = {
  id: string;
  locationId?: string;
  tableNumber: number | null;
  items: OrderLineDto[];
  status: string;
  placedAt: string;
  source: string;
  customerName?: string;
  customerPhone?: string;
};

export type TableDto = {
  id: string;
  locationId: string;
  number: number;
  seats: number;
  status: string;
  orderId?: string;
};

export type LocationDto = {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
};

export type MenuCategoryDto = {
  id: string;
  name: string;
  sortOrder: number;
};

export type CustomerDto = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  orderCount: number;
  totalSpentGrosze: number;
  updatedAt: string;
};

export type InventoryItemDto = {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  minStockQty: number;
  costGrosze: number;
  soldQty: number;
  recipeCount: number;
};

export type TenantDto = {
  displayName: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
};

export type SettingsDto = {
  currency: string;
  taxRateBps: number;
  enabledLanguages: string[];
  defaultLocale?: string;
  themeMode?: string;
  menuMode?: "shared" | "mixed" | "per_location";
};

type RestaurantContextType = {
  tenant: TenantDto | null;
  settings: SettingsDto | null;
  menuItems: MenuItemDto[];
  orders: OrderDto[];
  tables: TableDto[];
  locations: LocationDto[];
  categories: MenuCategoryDto[];
  customers: CustomerDto[];
  inventoryItems: InventoryItemDto[];
  activeLocationId: string | null;
  viewAllLocations: boolean;
  staffRole?: StaffRole;
  loading: boolean;
  refresh: () => Promise<void>;
  setActiveLocation: (locationId: string | null) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Omit<OrderDto, "items">> & { items?: OrderLineInput[] }) => Promise<void>;
  addOrder: (order: Partial<Omit<OrderDto, "items">> & { tableNumber?: number; items?: OrderLineInput[] }) => Promise<void>;
  updateTable: (number: number, updates: Partial<TableDto>) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItemDto>) => Promise<void>;
  addMenuItem: (item: Omit<MenuItemDto, "id">) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addLocation: (loc: Omit<LocationDto, "id">) => Promise<void>;
  updateLocation: (id: string, updates: Partial<LocationDto>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, updates: { name?: string; sortOrder?: number }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addInventoryItem: (item: { name: string; unit: string; stockQty: number; minStockQty: number; costGrosze: number }) => Promise<void>;
  purchaseStock: (inventoryItemId: string, quantity: number) => Promise<void>;
  payOrder: (orderId: string, payload: { tipGrosze: number; method: string }) => Promise<void>;
};

const RestaurantContext = createContext<RestaurantContextType | null>(null);

type Payload = {
  tenant: TenantDto | null;
  settings: SettingsDto | null;
  menuItems: MenuItemDto[];
  orders: OrderDto[];
  tables: TableDto[];
  locations: LocationDto[];
  categories?: MenuCategoryDto[];
  customers?: CustomerDto[];
  inventoryItems?: InventoryItemDto[];
  activeLocationId?: string | null;
  viewAllLocations?: boolean;
};

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantDto | null>(null);
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([]);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [tables, setTables] = useState<TableDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [categories, setCategories] = useState<MenuCategoryDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([]);
  const [activeLocationId, setActiveLocationIdState] = useState<string | null>(null);
  const [viewAllLocations, setViewAllLocations] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRole | undefined>();
  const [loading, setLoading] = useState(true);

  const applyPayload = useCallback((data: Payload) => {
    setTenant(data.tenant);
    setSettings(data.settings);
    setMenuItems(data.menuItems);
    setOrders(data.orders);
    setTables(data.tables);
    setLocations(data.locations);
    setCategories(data.categories ?? []);
    setCustomers(data.customers ?? []);
    setInventoryItems(data.inventoryItems ?? []);
    setActiveLocationIdState(data.activeLocationId ?? null);
    setViewAllLocations(Boolean(data.viewAllLocations));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setStaffRole(s.staffRole));
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/restaurant/data");
    if (!res.ok) return;
    applyPayload(await res.json());
  }, [applyPayload]);

  const setActiveLocation = useCallback(
    async (locationId: string | null) => {
      await fetch("/api/restaurant/data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
    const es = new EventSource("/api/restaurant/stream");

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; payload: Payload };
        if (msg.type === "update") applyPayload(msg.payload);
      } catch {
        /* ignore malformed events */
      }
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, [refresh, applyPayload]);

  const updateOrder = useCallback(
    async (id: string, updates: Partial<Omit<OrderDto, "items">> & { items?: OrderLineInput[] }) => {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await refresh();
    },
    [refresh],
  );

  const addOrder = useCallback(
    async (order: Partial<Omit<OrderDto, "items">> & { tableNumber?: number; items?: OrderLineInput[] }) => {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      await refresh();
    },
    [refresh],
  );

  const updateTable = useCallback(
    async (number: number, updates: Partial<TableDto>) => {
      await fetch(`/api/tables/${number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await refresh();
    },
    [refresh],
  );

  const updateMenuItem = useCallback(
    async (id: string, updates: Partial<MenuItemDto>) => {
      await fetch(`/api/menu/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await refresh();
    },
    [refresh],
  );

  const addMenuItem = useCallback(
    async (item: Omit<MenuItemDto, "id">) => {
      await fetch("/api/menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      await refresh();
    },
    [refresh],
  );

  const deleteMenuItem = useCallback(
    async (id: string) => {
      await fetch(`/api/menu/items/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  const addLocation = useCallback(
    async (loc: Omit<LocationDto, "id">) => {
      await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loc),
      });
      await refresh();
    },
    [refresh],
  );

  const updateLocation = useCallback(
    async (id: string, updates: Partial<LocationDto>) => {
      await fetch(`/api/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await refresh();
    },
    [refresh],
  );

  const deleteLocation = useCallback(
    async (id: string) => {
      await fetch(`/api/locations/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  const addCategory = useCallback(
    async (name: string) => {
      await fetch("/api/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await refresh();
    },
    [refresh],
  );

  const updateCategory = useCallback(
    async (id: string, updates: { name?: string; sortOrder?: number }) => {
      await fetch(`/api/menu/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await refresh();
    },
    [refresh],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await fetch(`/api/menu/categories/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  const addInventoryItem = useCallback(
    async (item: { name: string; unit: string; stockQty: number; minStockQty: number; costGrosze: number }) => {
      await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      await refresh();
    },
    [refresh],
  );

  const purchaseStock = useCallback(
    async (inventoryItemId: string, quantity: number) => {
      await fetch("/api/inventory/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId, quantity }),
      });
      await refresh();
    },
    [refresh],
  );

  const payOrder = useCallback(
    async (orderId: string, payload: { tipGrosze: number; method: string }) => {
      await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      tenant,
      settings,
      menuItems,
      orders,
      tables,
      locations,
      categories,
      customers,
      inventoryItems,
      activeLocationId,
      viewAllLocations,
      staffRole,
      loading,
      refresh,
      setActiveLocation,
      updateOrder,
      addOrder,
      updateTable,
      updateMenuItem,
      addMenuItem,
      deleteMenuItem,
      addLocation,
      updateLocation,
      deleteLocation,
      addCategory,
      updateCategory,
      deleteCategory,
      addInventoryItem,
      purchaseStock,
      payOrder,
    }),
    [
      tenant,
      settings,
      menuItems,
      orders,
      tables,
      locations,
      categories,
      customers,
      inventoryItems,
      activeLocationId,
      viewAllLocations,
      staffRole,
      loading,
      refresh,
      setActiveLocation,
      updateOrder,
      addOrder,
      updateTable,
      updateMenuItem,
      addMenuItem,
      deleteMenuItem,
      addLocation,
      updateLocation,
      deleteLocation,
      addCategory,
      updateCategory,
      deleteCategory,
      addInventoryItem,
      purchaseStock,
      payOrder,
    ],
  );

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
}
